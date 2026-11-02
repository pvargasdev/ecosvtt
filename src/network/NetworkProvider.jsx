import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Peer from 'peerjs';
import { GameContext, useGame } from '../context/GameContext';
import { imageDB } from '../context/db';
import { NetworkContext } from './index';
import { ENABLE_MODULE_ONLINE } from '../config/modules';
import { AssetSender, AssetClient, PRIORITY } from './assetTransfer';
import { audioTap } from './audioTap';
import {
    PROTOCOL_VERSION, CONTROL_LABEL, ASSETS_LABEL,
    HEARTBEAT_INTERVAL, HEARTBEAT_TIMEOUT, STATE_THROTTLE_MS, TOKEN_MOVE_THROTTLE_MS,
    generateRoomCode, roomCodeToPeerId, peerOptions, musicSdpTransform,
    buildPlayerScene, collectAdventureAssetIds, buildPrefetchList, isTokenHidden
} from './protocol';

const PLAYER_NAME_KEY = 'ecos_player_name';
const PLAYER_VOLUME_KEY = 'ecos_player_volume';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const LOCAL_EDIT_GRACE_MS = 600;
const CONNECT_TIMEOUT = 20000;

const EMPTY_SOUNDBOARD = {
    playlists: [], sfxGrid: [], activeTrack: null,
    masterVolume: { music: 0.5, sfx: 1.0 },
    fadeSettings: { fadeIn: 2000, fadeOut: 2000, crossfade: true }
};

const noop = () => {};

const NetworkProvider = ({ children }) => {
    const game = useGame();
    const gameRef = useRef(game);
    useEffect(() => { gameRef.current = game; });

    // mode: null (ainda não escolheu) | 'local' | 'host' | 'player'
    // Sem o módulo online, o programa abre direto no modo local (sem tela de escolha).
    const [mode, setMode] = useState(game.isGMWindow || !ENABLE_MODULE_ONLINE ? 'local' : null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    const [roomCode, setRoomCode] = useState(null);
    const [players, setPlayers] = useState([]);
    const [remote, setRemote] = useState(null);
    const [audioStream, setAudioStream] = useState(null);
    const [downloadStats, setDownloadStats] = useState({ active: 0, waiting: 0, total: 0, received: 0 });
    const [playerName, setPlayerName] = useState(() => {
        try { return localStorage.getItem(PLAYER_NAME_KEY) || ''; } catch { return ''; }
    });

    const [playerVolume, setPlayerVolumeState] = useState(() => {
        try { const v = parseFloat(localStorage.getItem(PLAYER_VOLUME_KEY)); return Number.isFinite(v) ? v : 0.8; } catch { return 0.8; }
    });
    const setPlayerVolume = useCallback((v) => {
        setPlayerVolumeState(v);
        try { localStorage.setItem(PLAYER_VOLUME_KEY, String(v)); } catch { /* opcional */ }
    }, []);

    const peerRef = useRef(null);
    const intentionalCloseRef = useRef(false);

    // --- Mestre -----------------------------------------------------------
    const clientsRef = useRef(new Map()); // peerId -> { name, control, assets, sender, call, ready, lastSeen }
    const audioStreamOutRef = useRef(null);
    const drawingVersionsRef = useRef(new Map()); // sceneId -> { layer, version }
    const lastStatePayloadRef = useRef(null);
    const stateTimerRef = useRef(null);
    const lastStateSentAtRef = useRef(0);
    const lastPrefetchSceneRef = useRef(null);

    // --- Jogador ----------------------------------------------------------
    const hostConnRef = useRef({ control: null, assets: null });
    const assetClientRef = useRef(null);
    const localEditsRef = useRef(new Map()); // tokenId -> timestamp da última edição local
    const pendingMovesRef = useRef(new Map());
    const moveTimerRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimerRef = useRef(null);
    const hostLastSeenRef = useRef(0);
    const drawingUrlsRef = useRef(new Set()); // URLs de camadas de desenho criadas (liberadas quando trocadas)
    const remoteSceneIdRef = useRef(null);
    const welcomedRef = useRef(false);

    // =====================================================================
    // Utilidades comuns
    // =====================================================================
    const resetState = useCallback(() => {
        clearTimeout(stateTimerRef.current);
        clearTimeout(moveTimerRef.current);
        clearTimeout(reconnectTimerRef.current);
        clientsRef.current.forEach(c => { c.sender?.close(); c.call?.close(); });
        clientsRef.current.clear();
        hostConnRef.current = { control: null, assets: null };
        pendingMovesRef.current.clear();
        localEditsRef.current.clear();
        drawingVersionsRef.current.clear();
        lastStatePayloadRef.current = null;
        lastPrefetchSceneRef.current = null;
        remoteSceneIdRef.current = null;
        welcomedRef.current = false;
        reconnectAttemptsRef.current = 0;
        drawingUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        drawingUrlsRef.current.clear();
        imageDB.setRemoteSource(null);
        assetClientRef.current = null;
        audioTap.stop();
        audioStreamOutRef.current = null;
        setPlayers([]);
        setRemote(null);
        setAudioStream(null);
        setDownloadStats({ active: 0, waiting: 0, total: 0, received: 0 });
    }, []);

    const destroyPeer = useCallback(() => {
        const peer = peerRef.current;
        peerRef.current = null;
        if (peer && !peer.destroyed) peer.destroy();
    }, []);

    const sendToClient = (client, msg) => {
        if (client.control?.open) client.control.send(msg);
    };

    const broadcastToPlayers = useCallback((msg) => {
        clientsRef.current.forEach(c => { if (c.ready) sendToClient(c, msg); });
    }, []);

    // =====================================================================
    // MESTRE
    // =====================================================================
    const currentDrawing = (scene) => {
        if (!scene?.drawingLayer) return null;
        const entry = drawingVersionsRef.current.get(scene.id);
        if (entry && entry.layer === scene.drawingLayer) return `drawing:${scene.id}:${entry.version}`;
        const version = (entry?.version || 0) + 1;
        drawingVersionsRef.current.set(scene.id, { layer: scene.drawingLayer, version });
        return `drawing:${scene.id}:${version}`;
    };

    const buildStatePayload = useCallback(() => {
        const { activeAdventure, activeScene } = gameRef.current;
        if (!activeAdventure || !activeScene) return { type: 'state', adventure: null, scene: null };
        return {
            type: 'state',
            adventure: { id: activeAdventure.id, name: activeAdventure.name, pinSettings: activeAdventure.pinSettings },
            scene: buildPlayerScene(activeScene, currentDrawing(activeScene))
        };
    }, []);

    const resolveHostBlob = useCallback(async (id) => {
        const { activeAdventure, activeScene } = gameRef.current;
        if (id.startsWith('drawing:')) {
            if (!activeScene || currentDrawing(activeScene) !== id) return null;
            return (await fetch(activeScene.drawingLayer)).blob();
        }
        if (!collectAdventureAssetIds(activeAdventure).has(id)) return null;
        return imageDB.getImage(id);
    }, []);

    const sendPrefetch = useCallback((client) => {
        const { activeAdventure, activeScene } = gameRef.current;
        const ids = buildPrefetchList(activeAdventure, activeScene);
        if (ids.length) sendToClient(client, { type: 'prefetch', ids });
    }, []);

    const removeClient = useCallback((peerId) => {
        const client = clientsRef.current.get(peerId);
        if (!client) return;
        client.sender?.close();
        client.call?.close();
        try { client.control?.close(); } catch { /* já fechado */ }
        try { client.assets?.close(); } catch { /* já fechado */ }
        clientsRef.current.delete(peerId);
        setPlayers(prev => prev.filter(p => p.id !== peerId));
    }, []);

    const startAudioCall = useCallback((peerId) => {
        const peer = peerRef.current;
        const client = clientsRef.current.get(peerId);
        if (!peer || !client) return;
        const stream = audioTap.start();
        if (!stream) return;
        const callPeer = (id, c) => {
            c.call?.close();
            c.call = peer.call(id, stream, { sdpTransform: musicSdpTransform, metadata: { kind: 'audio' } });
        };
        // Se a captura precisou ser recriada, todos os jogadores recebem a nova faixa.
        if (audioStreamOutRef.current && audioStreamOutRef.current !== stream) {
            clientsRef.current.forEach((c, id) => { if (id !== peerId && c.ready) callPeer(id, c); });
        }
        audioStreamOutRef.current = stream;
        callPeer(peerId, client);
    }, []);

    const handleTokenMove = useCallback((msg) => {
        const { activeScene, updateTokenInstance } = gameRef.current;
        if (!activeScene || msg.sceneId !== activeScene.id) return;
        const token = activeScene.tokens.find(t => t.id === msg.tokenId);
        if (!token || isTokenHidden(token, activeScene.fogOfWar || [])) return;
        const updates = {};
        if (Number.isFinite(msg.x)) updates.x = msg.x;
        if (Number.isFinite(msg.y)) updates.y = msg.y;
        if (Number.isFinite(msg.rotation)) updates.rotation = msg.rotation;
        if (Object.keys(updates).length) updateTokenInstance(activeScene.id, token.id, updates);
    }, []);

    const handleHostMessage = useCallback((peerId, msg) => {
        const client = clientsRef.current.get(peerId);
        if (!client || !msg || typeof msg !== 'object') return;
        client.lastSeen = Date.now();

        switch (msg.type) {
            case 'hello': {
                if (msg.protocol !== PROTOCOL_VERSION) {
                    sendToClient(client, { type: 'error', code: 'protocol' });
                    setTimeout(() => removeClient(peerId), 300);
                    return;
                }
                client.name = String(msg.name || '').slice(0, 32) || 'Player';
                client.ready = true;
                setPlayers(prev => [...prev.filter(p => p.id !== peerId), { id: peerId, name: client.name }]);
                sendToClient(client, { type: 'welcome', protocol: PROTOCOL_VERSION });
                sendToClient(client, lastStatePayloadRef.current || buildStatePayload());
                sendPrefetch(client);
                startAudioCall(peerId);
                break;
            }
            case 'asset_request':
                if (typeof msg.id !== 'string') break;
                if (client.sender) client.sender.request(msg.id, Number(msg.priority) || 0);
                else client.queued.push([msg.id, Number(msg.priority) || 0]);
                break;
            case 'token_move':
                handleTokenMove(msg);
                break;
            case 'bye':
                removeClient(peerId);
                break;
            default:
                break;
        }
    }, [buildStatePayload, sendPrefetch, startAudioCall, handleTokenMove, removeClient]);

    const handleIncomingConnection = useCallback((conn) => {
        const peerId = conn.peer;
        let client = clientsRef.current.get(peerId);
        if (!client) {
            client = { name: '', control: null, assets: null, sender: null, call: null, ready: false, lastSeen: Date.now(), queued: [] };
            clientsRef.current.set(peerId, client);
        }

        if (conn.label === ASSETS_LABEL) {
            client.assets = conn;
            client.sender?.close();
            client.sender = new AssetSender(conn, resolveHostBlob);
            client.queued.splice(0).forEach(([id, priority]) => client.sender.request(id, priority));
            conn.on('close', () => { if (client.assets === conn) client.sender?.close(); });
            return;
        }

        client.control = conn;
        conn.on('data', (msg) => handleHostMessage(peerId, msg));
        conn.on('close', () => { if (client.control === conn) removeClient(peerId); });
        conn.on('error', () => { if (client.control === conn) removeClient(peerId); });
    }, [resolveHostBlob, handleHostMessage, removeClient]);

    const startHosting = useCallback(() => {
        if (!ENABLE_MODULE_ONLINE) return;
        destroyPeer();
        resetState();
        intentionalCloseRef.current = false;
        setMode('host');
        setStatus('connecting');
        setError(null);

        // Prepara a captura de áudio já no clique (navegadores exigem um gesto do usuário).
        audioStreamOutRef.current = audioTap.start();

        const open = (attempt) => {
            const code = generateRoomCode();
            setRoomCode(code);
            const peer = new Peer(roomCodeToPeerId(code), peerOptions());
            peerRef.current = peer;
            peer.on('open', () => { if (peerRef.current === peer) setStatus('open'); });
            peer.on('connection', handleIncomingConnection);
            // Perder o servidor de sinalização não derruba quem já está conectado;
            // só impede novas entradas até reconectar.
            peer.on('disconnected', () => { if (peerRef.current === peer && !peer.destroyed) peer.reconnect(); });
            peer.on('error', (err) => {
                if (peerRef.current !== peer) return;
                if (err.type === 'unavailable-id' && attempt < 3) {
                    peer.destroy();
                    open(attempt + 1);
                    return;
                }
                if (err.type === 'peer-unavailable') return; // jogador saiu no meio de uma chamada
                if (['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible', 'unavailable-id'].includes(err.type)) {
                    setStatus('error');
                    setError(err.type === 'browser-incompatible' ? 'browser' : 'server');
                }
            });
        };
        open(0);
    }, [destroyPeer, resetState, handleIncomingConnection]);

    const stopHosting = useCallback(() => {
        intentionalCloseRef.current = true;
        broadcastToPlayers({ type: 'room_closed' });
        setTimeout(() => {
            destroyPeer();
            resetState();
            setRoomCode(null);
            setStatus('idle');
        }, 150);
    }, [broadcastToPlayers, destroyPeer, resetState]);

    const kickPlayer = useCallback((peerId) => {
        const client = clientsRef.current.get(peerId);
        if (!client) return;
        sendToClient(client, { type: 'kicked' });
        setTimeout(() => removeClient(peerId), 200);
    }, [removeClient]);

    const shareView = useCallback((view) => {
        broadcastToPlayers({ type: 'view', ...view });
    }, [broadcastToPlayers]);

    // Envia o estado da cena para os jogadores sempre que algo muda (com limite de frequência).
    const hostAdventure = mode === 'host' ? game.activeAdventure : null;
    const hostScene = mode === 'host' ? game.activeScene : null;
    useEffect(() => {
        if (mode !== 'host') return;
        const flush = () => {
            stateTimerRef.current = null;
            lastStateSentAtRef.current = Date.now();
            const payload = buildStatePayload();
            lastStatePayloadRef.current = payload;
            broadcastToPlayers(payload);
            const sceneId = payload.scene?.id || null;
            if (sceneId !== lastPrefetchSceneRef.current) {
                lastPrefetchSceneRef.current = sceneId;
                clientsRef.current.forEach(c => { if (c.ready) sendPrefetch(c); });
            }
        };
        if (stateTimerRef.current) return;
        const wait = Math.max(0, STATE_THROTTLE_MS - (Date.now() - lastStateSentAtRef.current));
        stateTimerRef.current = setTimeout(flush, wait);
    }, [mode, hostAdventure?.id, hostAdventure?.name, hostAdventure?.pinSettings, hostScene, buildStatePayload, broadcastToPlayers, sendPrefetch]);

    // Batimento: detecta jogadores que caíram sem avisar.
    useEffect(() => {
        if (mode !== 'host') return;
        const interval = setInterval(() => {
            const now = Date.now();
            clientsRef.current.forEach((c, peerId) => {
                if (now - c.lastSeen > HEARTBEAT_TIMEOUT) removeClient(peerId);
                else if (c.ready) sendToClient(c, { type: 'ping' });
            });
        }, HEARTBEAT_INTERVAL);
        return () => clearInterval(interval);
    }, [mode, removeClient]);

    // =====================================================================
    // JOGADOR
    // =====================================================================
    const sendToHost = useCallback((msg) => {
        const control = hostConnRef.current.control;
        if (control?.open) control.send(msg);
    }, []);

    const applyIncomingScene = useCallback((incoming) => {
        // Tokens que o próprio jogador está arrastando mantêm a posição local por um
        // instante, para o eco do mestre não fazer o token "voltar" no meio do gesto.
        const now = Date.now();
        setRemote(prev => {
            const prevTokens = prev?.scene?.id === incoming.scene.id ? prev.scene.tokens : [];
            const tokens = incoming.scene.tokens.map(t => {
                const editedAt = localEditsRef.current.get(t.id);
                if (!editedAt || now - editedAt > LOCAL_EDIT_GRACE_MS) return t;
                const local = prevTokens.find(lt => lt.id === t.id);
                return local ? { ...t, x: local.x, y: local.y, rotation: local.rotation } : t;
            });
            const drawingLayer = prev?.scene?.drawingId === incoming.scene.drawingId ? prev.scene.drawingLayer : (prev?.scene?.id === incoming.scene.id ? prev.scene.drawingLayer : null);
            return { adventure: incoming.adventure, scene: { ...incoming.scene, tokens, drawingLayer } };
        });

        if (remoteSceneIdRef.current !== incoming.scene.id) {
            remoteSceneIdRef.current = incoming.scene.id;
            const client = assetClientRef.current;
            // Pede primeiro a miniatura (chega quase na hora) e depois o mapa completo.
            if (client && incoming.scene.mapThumbnailId) client.get(incoming.scene.mapThumbnailId, PRIORITY.CRITICAL);
            if (client && incoming.scene.mapImageId) client.get(incoming.scene.mapImageId, PRIORITY.CRITICAL);
        }

        const drawingId = incoming.scene.drawingId;
        if (drawingId && assetClientRef.current) {
            assetClientRef.current.get(drawingId, PRIORITY.VISIBLE).then(blob => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                drawingUrlsRef.current.add(url);
                setRemote(prev => (!prev?.scene || prev.scene.drawingId !== drawingId)
                    ? prev
                    : { ...prev, scene: { ...prev.scene, drawingLayer: url } });
            });
        }
    }, []);

    // Libera as camadas de desenho antigas assim que a atual muda.
    const currentDrawingUrl = remote?.scene?.drawingLayer;
    useEffect(() => {
        drawingUrlsRef.current.forEach(url => {
            if (url !== currentDrawingUrl) { URL.revokeObjectURL(url); drawingUrlsRef.current.delete(url); }
        });
    }, [currentDrawingUrl]);

    const failPlayer = useCallback((code) => {
        intentionalCloseRef.current = true;
        destroyPeer();
        resetState();
        setStatus('closed');
        setError(code);
    }, [destroyPeer, resetState]);

    const handlePlayerMessage = useCallback((msg) => {
        if (!msg || typeof msg !== 'object') return;
        hostLastSeenRef.current = Date.now();
        switch (msg.type) {
            case 'welcome':
                welcomedRef.current = true;
                clearTimeout(reconnectTimerRef.current);
                reconnectAttemptsRef.current = 0;
                setStatus('open');
                setError(null);
                assetClientRef.current?.resendPending();
                break;
            case 'state':
                if (!msg.adventure || !msg.scene) {
                    remoteSceneIdRef.current = null;
                    setRemote(null);
                } else {
                    applyIncomingScene(msg);
                }
                break;
            case 'prefetch':
                if (Array.isArray(msg.ids)) assetClientRef.current?.prefetch(msg.ids);
                break;
            case 'view':
                window.dispatchEvent(new CustomEvent('ecos-remote-view', { detail: msg }));
                break;
            case 'ping':
                sendToHost({ type: 'pong' });
                break;
            case 'kicked':
                failPlayer('kicked');
                break;
            case 'room_closed':
                failPlayer('roomClosed');
                break;
            case 'error':
                failPlayer(msg.code === 'protocol' ? 'protocol' : 'connectionLost');
                break;
            default:
                break;
        }
    }, [applyIncomingScene, sendToHost, failPlayer]);

    const scheduleReconnect = useRef(null);

    const connectToHost = useCallback((code, name) => {
        const peer = peerRef.current;
        if (!peer || peer.destroyed) return;
        const hostId = roomCodeToPeerId(code);

        try { hostConnRef.current.control?.close(); } catch { /* já fechado */ }
        try { hostConnRef.current.assets?.close(); } catch { /* já fechado */ }

        const control = peer.connect(hostId, { label: CONTROL_LABEL, serialization: 'json', reliable: true });
        const assets = peer.connect(hostId, { label: ASSETS_LABEL, serialization: 'raw', reliable: true });
        hostConnRef.current = { control, assets };

        control.on('open', () => {
            hostLastSeenRef.current = Date.now();
            control.send({ type: 'hello', protocol: PROTOCOL_VERSION, name });
        });
        control.on('data', handlePlayerMessage);
        control.on('close', () => {
            if (hostConnRef.current.control === control && !intentionalCloseRef.current) scheduleReconnect.current?.(code, name);
        });
        assets.on('data', (data) => assetClientRef.current?.handleFrame(data));
    }, [handlePlayerMessage]);

    useEffect(() => {
        scheduleReconnect.current = (code, name) => {
            if (intentionalCloseRef.current) return;
            if (!welcomedRef.current) return; // nunca conectou: o erro de "sala não encontrada" já trata
            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) { failPlayer('connectionLost'); return; }
            reconnectAttemptsRef.current++;
            setStatus('reconnecting');
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
                const peer = peerRef.current;
                if (!peer || peer.destroyed) return;
                if (peer.disconnected) peer.reconnect();
                connectToHost(code, name);
            }, RECONNECT_DELAY);
        };
    });

    const joinRoom = useCallback((code, name) => {
        if (!ENABLE_MODULE_ONLINE) return;
        destroyPeer();
        resetState();
        intentionalCloseRef.current = false;
        const cleanName = (name || '').trim().slice(0, 32);
        try { localStorage.setItem(PLAYER_NAME_KEY, cleanName); } catch { /* opcional */ }
        setPlayerName(cleanName);
        setMode('player');
        setStatus('connecting');
        setError(null);
        setRoomCode(code);

        const client = new AssetClient((id, priority) => sendToHost({ type: 'asset_request', id, priority }));
        client.subscribe(setDownloadStats);
        assetClientRef.current = client;
        imageDB.setRemoteSource((id, options) => client.get(id, options?.priority ?? PRIORITY.VISIBLE));

        const peer = new Peer(peerOptions());
        peerRef.current = peer;
        // Sem resposta do mestre (ex.: rede que bloqueia conexões diretas) não fica
        // "conectando" para sempre.
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
            if (peerRef.current === peer && !welcomedRef.current) failPlayer('timeout');
        }, CONNECT_TIMEOUT);
        peer.on('open', () => connectToHost(code, cleanName || 'Player'));
        peer.on('call', (call) => {
            call.answer(undefined, { sdpTransform: musicSdpTransform });
            call.on('stream', (stream) => setAudioStream(stream));
        });
        peer.on('disconnected', () => { if (!peer.destroyed && !intentionalCloseRef.current) peer.reconnect(); });
        peer.on('error', (err) => {
            if (peerRef.current !== peer) return;
            if (err.type === 'peer-unavailable') {
                if (welcomedRef.current) scheduleReconnect.current?.(code, cleanName);
                else failPlayer('roomNotFound');
                return;
            }
            if (['network', 'server-error', 'socket-error', 'browser-incompatible'].includes(err.type) && !welcomedRef.current) {
                failPlayer(err.type === 'browser-incompatible' ? 'browser' : 'server');
            }
        });
    }, [destroyPeer, resetState, sendToHost, connectToHost, failPlayer]);

    const leaveRoom = useCallback(() => {
        intentionalCloseRef.current = true;
        sendToHost({ type: 'bye' });
        setTimeout(() => {
            destroyPeer();
            resetState();
            setRoomCode(null);
            setStatus('idle');
            setError(null);
            setMode(null);
        }, 100);
    }, [sendToHost, destroyPeer, resetState]);

    // Detecta queda silenciosa do mestre.
    useEffect(() => {
        if (mode !== 'player') return;
        const interval = setInterval(() => {
            if (!welcomedRef.current || intentionalCloseRef.current) return;
            if (Date.now() - hostLastSeenRef.current > HEARTBEAT_TIMEOUT) {
                hostLastSeenRef.current = Date.now();
                scheduleReconnect.current?.(roomCode, playerName);
            }
        }, HEARTBEAT_INTERVAL);
        return () => clearInterval(interval);
    }, [mode, roomCode, playerName]);

    // Movimentos de token do jogador: aplicados na hora localmente e enviados ao
    // mestre agrupados (no máximo a cada 40 ms), que valida e repassa a todos.
    const flushMoves = useCallback(() => {
        moveTimerRef.current = null;
        pendingMovesRef.current.forEach(move => sendToHost({ type: 'token_move', ...move }));
        pendingMovesRef.current.clear();
    }, [sendToHost]);

    const playerUpdateToken = useCallback((sceneId, tokenId, updates) => {
        const allowed = {};
        ['x', 'y', 'rotation'].forEach(k => { if (updates[k] !== undefined) allowed[k] = updates[k]; });
        if (!Object.keys(allowed).length) return;
        localEditsRef.current.set(tokenId, Date.now());
        setRemote(prev => {
            if (!prev?.scene || prev.scene.id !== sceneId) return prev;
            return { ...prev, scene: { ...prev.scene, tokens: prev.scene.tokens.map(t => t.id === tokenId ? { ...t, ...allowed } : t) } };
        });
        const pending = pendingMovesRef.current.get(tokenId) || { sceneId, tokenId };
        pendingMovesRef.current.set(tokenId, { ...pending, ...allowed });
        if (!moveTimerRef.current) moveTimerRef.current = setTimeout(flushMoves, TOKEN_MOVE_THROTTLE_MS);
    }, [flushMoves]);

    const chooseLocal = useCallback(() => {
        destroyPeer();
        resetState();
        setMode('local');
        setStatus('idle');
        setError(null);
    }, [destroyPeer, resetState]);

    const backToStart = useCallback(() => {
        if (!ENABLE_MODULE_ONLINE) { gameRef.current.setActiveAdventureId(null); return; }
        if (mode === 'host') stopHosting();
        else if (mode === 'player') leaveRoom();
        gameRef.current.setActiveAdventureId(null);
        setMode(null);
        setStatus('idle');
        setError(null);
    }, [mode, stopHosting, leaveRoom]);

    const { setCrossWindowSyncEnabled } = game;
    useEffect(() => {
        setCrossWindowSyncEnabled?.(mode !== 'player');
    }, [mode, setCrossWindowSyncEnabled]);

    useEffect(() => () => { destroyPeer(); }, [destroyPeer]);

    // =====================================================================
    // Contexto do jogo visto pelo jogador: a aventura vem do mestre e qualquer
    // ação que alteraria dados vira no-op, exceto mover/rotacionar tokens.
    // =====================================================================
    const isPlayer = mode === 'player';
    const gameValue = useMemo(() => {
        if (!isPlayer) return game;
        const adventure = remote ? { ...remote.adventure, scenes: [remote.scene], activeSceneId: remote.scene.id, tokenLibrary: [] } : null;
        const blocked = {};
        [
            'createAdventure', 'deleteAdventure', 'updateAdventure', 'duplicateAdventure', 'exportAdventure', 'importAdventure',
            'addScene', 'duplicateScene', 'updateScene', 'updateSceneMap', 'setActiveScene', 'deleteScene', 'addSceneFolder', 'moveSceneItem',
            'addFogArea', 'updateFogArea', 'deleteFogArea', 'deleteMultipleFogAreas',
            'addTokenInstance', 'deleteTokenInstance', 'deleteMultipleTokenInstances', 'importCharacterAsToken', 'addTokenToLibrary',
            'addPin', 'updatePin', 'deletePin', 'deleteMultiplePins', 'updateSceneDrawing', 'updateSceneLighting', 'toggleAdventurePinVisibility',
            'setActiveTool', 'playTrack', 'stopTrack', 'triggerSfxRemote'
        ].forEach(k => { blocked[k] = noop; });
        return {
            ...game,
            ...blocked,
            isGMWindow: false,
            activeAdventureId: adventure?.id ?? null,
            activeAdventure: adventure,
            activeScene: remote?.scene ?? null,
            activeTool: 'select',
            soundboard: EMPTY_SOUNDBOARD,
            updateTokenInstance: playerUpdateToken,
            setActiveAdventureId: (id) => { if (!id) leaveRoom(); }
        };
    }, [isPlayer, game, remote, playerUpdateToken, leaveRoom]);

    const networkValue = useMemo(() => ({
        mode, status, error, roomCode, players, audioStream, downloadStats, playerName, playerVolume, setPlayerVolume,
        isHost: mode === 'host', isPlayer, isOnline: mode === 'host' || mode === 'player',
        hasRemoteAdventure: !!remote,
        chooseLocal, startHosting, stopHosting, joinRoom, leaveRoom, kickPlayer, shareView, backToStart
    }), [mode, status, error, roomCode, players, audioStream, downloadStats, playerName, playerVolume, setPlayerVolume, isPlayer, remote,
        chooseLocal, startHosting, stopHosting, joinRoom, leaveRoom, kickPlayer, shareView, backToStart]);

    return (
        <NetworkContext.Provider value={networkValue}>
            <GameContext.Provider value={gameValue}>{children}</GameContext.Provider>
        </NetworkContext.Provider>
    );
};

export default NetworkProvider;
