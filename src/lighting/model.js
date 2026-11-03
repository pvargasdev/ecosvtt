import { EMPTY_WALLS, newId } from './geometry';

// scene.lighting (ausente = módulo desligado nesta cena, tudo funciona como antes)
export const DEFAULT_LIGHTING = {
    enabled: false,
    ambientLevel: 0.15,      // iluminação base: 0 = breu, 1 = mapa normal
    ambientColor: '#ffffff', // cor da iluminação base (ex.: azulado para luar)
    lights: [],
    walls: EMPTY_WALLS
};

export const getLighting = (scene) => ({ ...DEFAULT_LIGHTING, ...(scene?.lighting || {}) });

export const isLightingActive = (scene) => !!scene?.lighting?.enabled;

export const LIGHT_COLORS = [
    { hex: '#ffb46b', key: 'torch' },
    { hex: '#ffe2a8', key: 'candle' },
    { hex: '#ffffff', key: 'white' },
    { hex: '#9ec5ff', key: 'moon' },
    { hex: '#8affb0', key: 'green' },
    { hex: '#ff6b6b', key: 'red' },
    { hex: '#c49bff', key: 'arcane' }
];

export const AMBIENT_PRESETS = [
    { key: 'day', level: 1, color: '#ffffff' },
    { key: 'dusk', level: 0.55, color: '#ffd2a8' },
    { key: 'night', level: 0.18, color: '#8fa8ff' },
    { key: 'dark', level: 0, color: '#ffffff' }
];

export const createLight = (type, x, y) => ({
    id: newId(),
    type,                 // 'point' | 'spot'
    x, y,
    color: '#ffb46b',
    intensity: 0.9,       // 0..1
    radius: 500,          // alcance em px do mundo
    softness: 0.6,        // 0 = borda dura, 1 = degradê do centro até a borda
    angle: 60,            // abertura do holofote, em graus
    direction: 0,         // direção do holofote, em graus (0 = direita)
    castShadows: true,
    enabled: true,
    flicker: { ...DEFAULT_FLICKER }
});

// Piscar: a luz fica `interval` segundos na cor normal e `duration` segundos na cor
// do piscar, em ciclo. `irregular` sorteia o momento e a duração de cada piscada.
export const DEFAULT_FLICKER = { enabled: false, color: '#000000', interval: 1, duration: 0.15, irregular: false };
export const getFlicker = (light) => ({ ...DEFAULT_FLICKER, ...(light?.flicker || {}) });

// --- Luzes presas a tokens --------------------------------------------------
// token.lights = { point: {...}|null, spot: {...}|null } (mesmas propriedades de uma
// luz, sem id/posição). A posição vem do centro do token; a direção do holofote é
// token.rotation + token.lightDirection, então ele gira junto com o token e Shift+Q/E
// gira só a "lanterna".
export const TOKEN_LIGHT_TYPES = ['point', 'spot'];
export const DEFAULT_TOKEN_LIGHT_DIRECTION = -90;

export const createTokenLight = (type) => {
    const { id: _ID, x: _X, y: _Y, ...props } = createLight(type, 0, 0);
    return type === 'spot'
        ? { ...props, color: '#fff1d6', radius: 700, angle: 50, softness: 0.5 }
        : { ...props, radius: 350 };
};

export const tokenLightDirection = (token) => (token.rotation || 0) + (token.lightDirection ?? DEFAULT_TOKEN_LIGHT_DIRECTION);

export const collectTokenLights = (tokens, baseSize) => {
    const out = [];
    (tokens || []).forEach(token => {
        if (!token.lights) return;
        const size = baseSize * (token.scale || 1);
        const cx = token.x + size / 2, cy = token.y + size / 2;
        TOKEN_LIGHT_TYPES.forEach(type => {
            const light = token.lights[type];
            if (!light) return;
            out.push({
                ...light, type, id: `${token.id}:${type}`, x: cx, y: cy,
                direction: type === 'spot' ? tokenLightDirection(token) : 0
            });
        });
    });
    return out;
};
