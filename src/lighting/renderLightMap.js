import { computeVisibility, flattenWalls } from './geometry';

// Renderiza o "mapa de luz" da cena num canvas em coordenadas do mundo.
//
// O canvas é exibido por cima do mapa e dos tokens com mix-blend-mode: multiply:
// branco = cena intacta, preto = escuridão total, cores = luz colorida. Ele só é
// redesenhado quando luzes/paredes mudam; mover ou dar zoom na câmera não custa nada,
// pois é só uma transformação CSS (igual ao mapa). A resolução é baixa de propósito
// (luz é suave por natureza) e o resultado passa por um leve desfoque para as bordas
// das sombras não ficarem serrilhadas.

const MAX_DIMENSION = 2048;
const INTERACTIVE_MAX_DIMENSION = 1024;
const SHADOW_BLUR_PX = 1.5;

const hexToRgb = (hex) => {
    const h = (hex || '#ffffff').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

// Área do mundo coberta pelo mapa de luz: o mapa + o alcance das luzes + as paredes.
export const computeLightingExtent = (lighting, mapRect) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const extend = (x1, y1, x2, y2) => { minX = Math.min(minX, x1); minY = Math.min(minY, y1); maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2); };
    if (mapRect) extend(mapRect.x, mapRect.y, mapRect.x + mapRect.w, mapRect.y + mapRect.h);
    lighting.lights.forEach(l => extend(l.x - l.radius, l.y - l.radius, l.x + l.radius, l.y + l.radius));
    lighting.walls.vertices.forEach(v => extend(v.x, v.y, v.x, v.y));
    if (!Number.isFinite(minX)) extend(-2000, -2000, 2000, 2000);
    const margin = 400;
    return { x: minX - margin, y: minY - margin, w: maxX - minX + margin * 2, h: maxY - minY + margin * 2 };
};

// Polígonos de visibilidade são o cálculo mais caro; ficam em cache por luz e só
// são refeitos quando a própria luz ou as paredes mudam.
export const createVisibilityCache = () => new Map();

const getVisibility = (cache, light, walls, flat) => {
    const key = `${light.x}|${light.y}|${light.radius}`;
    const entry = cache.get(light.id);
    if (entry && entry.key === key && entry.walls === walls) return entry.polygon;
    const polygon = computeVisibility(light.x, light.y, light.radius, flat);
    cache.set(light.id, { key, walls, polygon });
    return polygon;
};

const pathPolygon = (ctx, pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
};

const radialGradient = (ctx, light, rgb) => {
    const g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
    const inner = Math.max(0, Math.min(0.98, 1 - light.softness));
    g.addColorStop(0, rgba(rgb, light.intensity));
    g.addColorStop(inner, rgba(rgb, light.intensity * (inner > 0 ? 0.9 : 1)));
    g.addColorStop(1, rgba(rgb, 0));
    return g;
};

let layerCanvas = null;
const getLayer = (w, h) => {
    if (!layerCanvas) layerCanvas = document.createElement('canvas');
    if (layerCanvas.width !== w || layerCanvas.height !== h) { layerCanvas.width = w; layerCanvas.height = h; }
    const lctx = layerCanvas.getContext('2d');
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, w, h);
    return layerCanvas;
};

let scratch = null;
const getScratch = (w, h) => {
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width < w) scratch.width = w;
    if (scratch.height < h) scratch.height = h;
    return scratch;
};

// Holofote: degradê radial recortado por um cone, com bordas laterais suaves feitas
// por um degradê cônico usado como máscara.
const drawSpot = (ctx, light, rgb, scale) => {
    const sizePx = Math.max(2, Math.ceil(light.radius * 2 * scale));
    const tmp = getScratch(sizePx, sizePx);
    const tctx = tmp.getContext('2d');
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.globalCompositeOperation = 'source-over';
    tctx.clearRect(0, 0, sizePx, sizePx);
    tctx.setTransform(scale, 0, 0, scale, -(light.x - light.radius) * scale, -(light.y - light.radius) * scale);
    tctx.fillStyle = radialGradient(tctx, light, rgb);
    tctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);

    const dir = (light.direction * Math.PI) / 180;
    const half = (Math.max(1, Math.min(359, light.angle)) * Math.PI) / 360;
    const edge = Math.min(half, Math.max(0.02, half * light.softness * 0.6));
    const start = dir - half;
    const cone = tctx.createConicGradient(start, light.x, light.y);
    const span = (half * 2) / (Math.PI * 2);
    const edgeSpan = edge / (Math.PI * 2);
    cone.addColorStop(0, 'rgba(0,0,0,0)');
    cone.addColorStop(Math.min(edgeSpan, span / 2), 'rgba(0,0,0,1)');
    cone.addColorStop(Math.max(span - edgeSpan, span / 2), 'rgba(0,0,0,1)');
    cone.addColorStop(span, 'rgba(0,0,0,0)');
    if (span < 1) cone.addColorStop(Math.min(1, span + 0.0001), 'rgba(0,0,0,0)');
    tctx.globalCompositeOperation = 'destination-in';
    tctx.fillStyle = cone;
    tctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);

    ctx.drawImage(tmp, 0, 0, sizePx, sizePx, light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
};

export const renderLightMap = (canvas, lighting, extent, { cache, interactive = false } = {}) => {
    const maxDim = interactive ? INTERACTIVE_MAX_DIMENSION : MAX_DIMENSION;
    const scale = Math.min(1, maxDim / Math.max(extent.w, extent.h));
    const w = Math.max(1, Math.round(extent.w * scale));
    const h = Math.max(1, Math.round(extent.h * scale));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = rgba(hexToRgb(lighting.ambientColor).map(c => Math.round(c * lighting.ambientLevel)), 1);
    ctx.fillRect(0, 0, w, h);

    const lights = lighting.lights.filter(l => l.enabled && l.intensity > 0 && l.radius > 0);
    if (lights.length === 0) return scale;

    // As luzes são somadas num canvas à parte e aplicadas de uma vez, com desfoque,
    // por cima da iluminação base.
    const layer = getLayer(w, h);
    const lctx = layer.getContext('2d');
    lctx.globalCompositeOperation = 'lighter';
    const flat = flattenWalls(lighting.walls);

    lights.forEach(light => {
        const rgb = hexToRgb(light.color);
        const polygon = light.castShadows ? getVisibility(cache || new Map(), light, lighting.walls, flat) : null;
        lctx.save();
        lctx.setTransform(scale, 0, 0, scale, -extent.x * scale, -extent.y * scale);
        if (polygon && polygon.length >= 6) { pathPolygon(lctx, polygon); lctx.clip(); }
        if (light.type === 'spot') {
            drawSpot(lctx, light, rgb, scale);
        } else {
            lctx.fillStyle = radialGradient(lctx, light, rgb);
            lctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
        }
        lctx.restore();
    });

    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${SHADOW_BLUR_PX}px)`;
    ctx.drawImage(layer, 0, 0);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    return scale;
};
