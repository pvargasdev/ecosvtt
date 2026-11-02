import { useEffect, useState } from 'react';

// Diagnóstico de compatibilidade da rede com conexões ponto a ponto (sem TURN).
//
// Perguntamos a dois servidores STUN diferentes qual endereço público a rede nos
// atribui:
//  - mesma porta pública para os dois  → NAT "cone": conexões diretas funcionam;
//  - porta muda conforme o destino     → NAT simétrico: conexão direta costuma
//    falhar quando o outro lado também está atrás de NAT restritivo;
//  - nenhuma resposta                  → UDP bloqueado (firewall): não conecta.
//
// O teste leva poucos segundos, não envia nada além das consultas STUN e roda uma
// vez por sessão.

const STUN_SERVERS = ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'];
const GATHER_TIMEOUT = 6000;

let cached = null;

const parseSrflx = (candidate) => {
    // "candidate:... 1 udp 1677729535 203.0.113.7 54321 typ srflx raddr ..."
    const parts = candidate.split(' ');
    const typIndex = parts.indexOf('typ');
    if (typIndex < 0 || parts[typIndex + 1] !== 'srflx') return null;
    return { ip: parts[4], port: parts[5], protocol: parts[2]?.toLowerCase() };
};

const runCheck = () => new Promise((resolve) => {
    if (typeof RTCPeerConnection === 'undefined') { resolve('unsupported'); return; }
    let pc;
    try {
        pc = new RTCPeerConnection({ iceServers: STUN_SERVERS.map(urls => ({ urls })) });
    } catch {
        resolve('unknown');
        return;
    }
    const portsByIp = new Map(); // IP público -> portas públicas vistas
    let finished = false;

    const finish = () => {
        if (finished) return;
        finished = true;
        try { pc.close(); } catch { /* já fechado */ }
        if (portsByIp.size === 0) { resolve('blocked'); return; }
        // Endereços idênticos são unificados pelo navegador; o mesmo IP aparecer com
        // portas diferentes (uma por servidor STUN) indica NAT simétrico.
        const symmetric = [...portsByIp.values()].some(ports => ports.size > 1);
        resolve(symmetric ? 'symmetric' : 'ok');
    };

    pc.onicecandidate = (e) => {
        if (!e.candidate) { finish(); return; }
        const info = parseSrflx(e.candidate.candidate);
        if (!info || info.protocol !== 'udp') return;
        if (!portsByIp.has(info.ip)) portsByIp.set(info.ip, new Set());
        portsByIp.get(info.ip).add(info.port);
    };
    pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') finish(); };

    pc.createDataChannel('probe');
    pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => finish());
    setTimeout(finish, GATHER_TIMEOUT);
});

// Resultado: 'checking' | 'ok' | 'symmetric' | 'blocked' | 'unknown' | 'unsupported'
export const checkNetwork = () => {
    if (!cached) cached = runCheck();
    return cached;
};

export const isNetworkProblem = (status) => status === 'symmetric' || status === 'blocked';

export const useNetworkCheck = (enabled = true) => {
    const [status, setStatus] = useState('checking');
    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        checkNetwork().then(result => { if (alive) setStatus(result); });
        return () => { alive = false; };
    }, [enabled]);
    return status;
};
