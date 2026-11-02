// Protocolo da sessão online (mestre = host, jogadores = players).
//
// A conexão é WebRTC ponto a ponto. O servidor público do PeerJS é usado apenas
// para o "aperto de mão" inicial (sinalização); depois disso todo o tráfego
// (estado do jogo, imagens e áudio) vai direto entre o computador do mestre e
// o de cada jogador. Se um dia quiser um servidor próprio, basta preencher
// PEER_SERVER com { host, port, path, secure }.

export const PROTOCOL_VERSION = 1;
export const PEER_ID_PREFIX = 'ecosvtt-room-';
export const PEER_SERVER = null;

// Canais por jogador: "control" leva mensagens JSON pequenas (estado, comandos);
// "assets" leva só binário (imagens). Canais separados evitam que o download de
// um mapa grande atrase a movimentação de tokens.
export const CONTROL_LABEL = 'control';
export const ASSETS_LABEL = 'assets';

export const HEARTBEAT_INTERVAL = 4000;
export const HEARTBEAT_TIMEOUT = 15000;
export const STATE_THROTTLE_MS = 50;
export const TOKEN_MOVE_THROTTLE_MS = 40;

// Sem caracteres ambíguos (0/O, 1/I/L) para facilitar ditar o código por voz.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export const generateRoomCode = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
    const chars = Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
};

// Aceita o código digitado de qualquer jeito (minúsculas, sem hífen, com espaços).
export const normalizeRoomCode = (input) => {
    const clean = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length !== CODE_LENGTH) return null;
    if ([...clean].some(c => !CODE_ALPHABET.includes(c))) return null;
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
};

export const roomCodeToPeerId = (code) => PEER_ID_PREFIX + code.replace('-', '').toLowerCase();

export const peerOptions = () => (PEER_SERVER ? { ...PEER_SERVER, debug: 1 } : { debug: 1 });

// Áudio do mestre é transmitido como faixa WebRTC (Opus). Por padrão o navegador
// negocia mono em baixa taxa, pensado para voz; aqui forçamos estéreo e 128 kbps.
export const musicSdpTransform = (sdp) => sdp.replace(
    /a=fmtp:(\d+) (.*minptime=\d+.*)/g,
    (line, pt, params) => {
        const extra = ['stereo=1', 'sprop-stereo=1', 'maxaveragebitrate=128000']
            .filter(p => !params.includes(p.split('=')[0] + '='));
        return extra.length ? `a=fmtp:${pt} ${params};${extra.join(';')}` : line;
    }
);

// Retângulos de fog que cobrem totalmente um elemento escondem esse elemento do jogador.
const isHiddenByFog = (rect, fogAreas) => fogAreas.some(f =>
    rect.x >= f.x && rect.y >= f.y &&
    rect.x + rect.w <= f.x + f.width && rect.y + rect.h <= f.y + f.height
);

export const TOKEN_BASE_SIZE = 70;

export const isTokenHidden = (token, fogAreas) => {
    const size = TOKEN_BASE_SIZE * (token.scale || 1);
    return isHiddenByFog({ x: token.x, y: token.y, w: size, h: size }, fogAreas);
};

// Monta a versão da cena que os jogadores podem ver: sem dados exclusivos do mestre,
// sem a camada de desenho embutida (vai como asset) e sem nada escondido pela fog.
export const buildPlayerScene = (scene, drawingId) => {
    const fog = scene.fogOfWar || [];
    // eslint-disable-next-line no-unused-vars
    const { drawingLayer, savedView, ...rest } = scene;
    return {
        ...rest,
        tokens: (scene.tokens || []).filter(t => !isTokenHidden(t, fog)),
        pins: (scene.pins || []).filter(p => !isHiddenByFog({ x: p.x, y: p.y, w: 0, h: 0 }, fog)),
        fogOfWar: fog,
        drawingId
    };
};

// IDs de imagens que um jogador pode pedir (qualquer coisa fora disso é recusada).
export const collectAdventureAssetIds = (adventure) => {
    const ids = new Set();
    adventure?.scenes?.forEach(s => {
        if (s.mapImageId) ids.add(s.mapImageId);
        if (s.mapThumbnailId) ids.add(s.mapThumbnailId);
        s.tokens?.forEach(t => { if (t.imageId) ids.add(t.imageId); });
    });
    return ids;
};

// Pré-carregamento em segundo plano: miniaturas de todas as cenas (leves, permitem
// mostrar algo na hora em uma troca de cena) e mapas completos das cenas ligadas
// por pins da cena atual (os próximos destinos mais prováveis).
export const buildPrefetchList = (adventure, scene) => {
    if (!adventure || !scene) return [];
    const list = [];
    const scenes = adventure.scenes.filter(s => s.type !== 'folder');
    const linked = new Set((scene.pins || []).map(p => p.linkedSceneId).filter(Boolean));
    scenes.forEach(s => {
        if (s.id === scene.id) return;
        if (linked.has(s.id) && s.mapImageId) list.push(s.mapImageId);
    });
    scenes.forEach(s => {
        if (s.id !== scene.id && s.mapThumbnailId) list.push(s.mapThumbnailId);
    });
    return list;
};

// --- Quadros binários do canal de assets ---------------------------------
// META:    [u8 1][u32 transferId][u32 size][u16 idLen][id][u16 mimeLen][mime]
// DATA:    [u8 2][u32 transferId][u32 offset][payload]
// MISSING: [u8 3][u16 idLen][id]
export const FRAME_META = 1;
export const FRAME_DATA = 2;
export const FRAME_MISSING = 3;
export const CHUNK_SIZE = 64 * 1024;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const encodeMeta = (transferId, size, id, mime) => {
    const idBytes = encoder.encode(id);
    const mimeBytes = encoder.encode(mime || '');
    const buf = new ArrayBuffer(1 + 4 + 4 + 2 + idBytes.length + 2 + mimeBytes.length);
    const view = new DataView(buf);
    let o = 0;
    view.setUint8(o, FRAME_META); o += 1;
    view.setUint32(o, transferId); o += 4;
    view.setUint32(o, size); o += 4;
    view.setUint16(o, idBytes.length); o += 2;
    new Uint8Array(buf, o, idBytes.length).set(idBytes); o += idBytes.length;
    view.setUint16(o, mimeBytes.length); o += 2;
    new Uint8Array(buf, o, mimeBytes.length).set(mimeBytes);
    return buf;
};

export const encodeData = (transferId, offset, bytes) => {
    const buf = new ArrayBuffer(9 + bytes.byteLength);
    const view = new DataView(buf);
    view.setUint8(0, FRAME_DATA);
    view.setUint32(1, transferId);
    view.setUint32(5, offset);
    new Uint8Array(buf, 9).set(bytes);
    return buf;
};

export const encodeMissing = (id) => {
    const idBytes = encoder.encode(id);
    const buf = new ArrayBuffer(3 + idBytes.length);
    const view = new DataView(buf);
    view.setUint8(0, FRAME_MISSING);
    view.setUint16(1, idBytes.length);
    new Uint8Array(buf, 3).set(idBytes);
    return buf;
};

export const decodeFrame = (buf) => {
    const view = new DataView(buf);
    const type = view.getUint8(0);
    if (type === FRAME_DATA) {
        return { type, transferId: view.getUint32(1), offset: view.getUint32(5), bytes: new Uint8Array(buf, 9) };
    }
    if (type === FRAME_META) {
        let o = 1;
        const transferId = view.getUint32(o); o += 4;
        const size = view.getUint32(o); o += 4;
        const idLen = view.getUint16(o); o += 2;
        const id = decoder.decode(new Uint8Array(buf, o, idLen)); o += idLen;
        const mimeLen = view.getUint16(o); o += 2;
        const mime = decoder.decode(new Uint8Array(buf, o, mimeLen));
        return { type, transferId, size, id, mime };
    }
    if (type === FRAME_MISSING) {
        const idLen = view.getUint16(1);
        return { type, id: decoder.decode(new Uint8Array(buf, 3, idLen)) };
    }
    return null;
};
