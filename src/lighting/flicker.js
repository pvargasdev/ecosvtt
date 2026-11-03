import { getFlicker } from './model';

// Estado do "piscar" das luzes num instante. É determinístico (depende só do tempo e
// do id da luz), então não guarda estado e não precisa ser sincronizado pela rede.

const hash = (str, n) => {
    let h = 2166136261 ^ Math.floor(n * 1000);
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const hasFlicker = (light) => !!(light.enabled && light.flicker?.enabled);

export const isFlickering = (light, timeSec) => {
    const f = getFlicker(light);
    const interval = Math.max(0.02, f.interval);
    const duration = Math.max(0.02, f.duration);
    const period = interval + duration;
    if (!f.irregular) return timeSec % period >= interval;

    // Irregular: cada ciclo sorteia se pisca, quando e por quanto tempo.
    const cycle = Math.floor(timeSec / period);
    const phase = timeSec - cycle * period;
    if (hash(light.id, cycle) < 0.3) return false;
    const start = hash(light.id, cycle + 0.37) * interval;
    const length = duration * (0.4 + hash(light.id, cycle + 0.71) * 1.2);
    return phase >= start && phase < start + length;
};

// Conjunto (como texto) das luzes que estão na cor do piscar agora.
export const flickerKey = (lights, timeSec) => lights
    .filter(l => hasFlicker(l) && isFlickering(l, timeSec))
    .map(l => l.id)
    .join('|');

export const applyFlicker = (lighting, key) => {
    if (!key) return lighting;
    const active = new Set(key.split('|'));
    return {
        ...lighting,
        lights: lighting.lights.map(l => (active.has(l.id) ? { ...l, color: getFlicker(l).color } : l))
    };
};
