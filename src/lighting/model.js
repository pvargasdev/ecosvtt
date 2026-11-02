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
    enabled: true
});
