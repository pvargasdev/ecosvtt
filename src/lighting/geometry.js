// Geometria do sistema de iluminação.
//
// Paredes são um grafo: vértices compartilhados + segmentos que ligam dois vértices.
// Como os segmentos apontam para o mesmo vértice (e não para cópias de coordenadas),
// paredes conectadas nunca têm frestas, e mover um vértice move todas as paredes
// ligadas a ele. Um segmento pode ser curvo (Bézier quadrática com ponto de controle).
//
// scene.lighting.walls = {
//   vertices: [{ id, x, y }],
//   segments: [{ id, a, b, c?, door?, open? }]
//   // a/b = ids de vértices, c = { x, y } ponto de controle,
//   // door = o trecho é uma porta; open = porta aberta (não bloqueia a luz)
// }

export const EMPTY_WALLS = { vertices: [], segments: [] };

const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export const quadPoint = (p0, c, p1, t) => {
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
};

// A alça de curva fica sobre a própria linha (no meio da curva), o que é mais intuitivo
// do que arrastar o ponto de controle invisível. Estas funções convertem entre os dois.
export const curveMidpoint = (p0, c, p1) => quadPoint(p0, c, p1, 0.5);
export const controlFromMidpoint = (p0, m, p1) => ({ x: 2 * m.x - (p0.x + p1.x) / 2, y: 2 * m.y - (p0.y + p1.y) / 2 });

export const vertexMap = (walls) => {
    const map = new Map();
    walls.vertices.forEach(v => map.set(v.id, v));
    return map;
};

export const segmentHandle = (seg, va, vb) => (seg.c ? curveMidpoint(va, seg.c, vb) : lerp(va, vb, 0.5));

// --- Achatar paredes em segmentos retos (curvas viram vários trechos) -------
const flattenCache = new WeakMap();

export const flattenWalls = (walls) => {
    if (!walls) return [];
    const cached = flattenCache.get(walls);
    if (cached) return cached;
    const verts = vertexMap(walls);
    const out = [];
    walls.segments.forEach(seg => {
        const a = verts.get(seg.a), b = verts.get(seg.b);
        if (!a || !b || (seg.door && seg.open)) return;
        if (!seg.c) { out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, segId: seg.id }); return; }
        const approxLen = Math.hypot(seg.c.x - a.x, seg.c.y - a.y) + Math.hypot(b.x - seg.c.x, b.y - seg.c.y);
        const steps = Math.max(6, Math.min(32, Math.round(approxLen / 30)));
        let prev = a;
        for (let i = 1; i <= steps; i++) {
            const p = i === steps ? b : quadPoint(a, seg.c, b, i / steps);
            out.push({ x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, segId: seg.id });
            prev = p;
        }
    });
    flattenCache.set(walls, out);
    return out;
};

// --- Testes de clique ------------------------------------------------------
export const projectOnSegment = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
    return { x: x1 + dx * t, y: y1 + dy * t, t };
};

export const hitVertex = (walls, p, tol, excludeId = null) => {
    let best = null, bestD = tol * tol;
    walls.vertices.forEach(v => {
        if (v.id === excludeId) return;
        const d = dist2(v.x, v.y, p.x, p.y);
        if (d <= bestD) { best = v; bestD = d; }
    });
    return best;
};

export const hitHandle = (walls, p, tol) => {
    const verts = vertexMap(walls);
    let best = null, bestD = tol * tol;
    walls.segments.forEach(seg => {
        const a = verts.get(seg.a), b = verts.get(seg.b);
        if (!a || !b) return;
        const h = segmentHandle(seg, a, b);
        const d = dist2(h.x, h.y, p.x, p.y);
        if (d <= bestD) { best = seg; bestD = d; }
    });
    return best;
};

// Retorna o segmento mais próximo e o parâmetro t (0..1) ao longo dele.
export const hitSegment = (walls, p, tol) => {
    const flat = flattenWalls(walls);
    const bySeg = new Map();
    flat.forEach(f => { if (!bySeg.has(f.segId)) bySeg.set(f.segId, []); bySeg.get(f.segId).push(f); });
    let best = null, bestD = tol * tol;
    bySeg.forEach((pieces, segId) => {
        pieces.forEach((f, i) => {
            const pr = projectOnSegment(p.x, p.y, f.x1, f.y1, f.x2, f.y2);
            const d = dist2(pr.x, pr.y, p.x, p.y);
            if (d <= bestD) {
                bestD = d;
                best = { segId, point: { x: pr.x, y: pr.y }, t: (i + pr.t) / pieces.length };
            }
        });
    });
    return best;
};

// --- Edição do grafo (sempre imutável) -------------------------------------
let idCounter = 0;
export const newId = () => `${Date.now().toString(36)}${(idCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const addVertex = (walls, x, y) => {
    const v = { id: newId(), x, y };
    return { walls: { ...walls, vertices: [...walls.vertices, v] }, vertex: v };
};

export const addSegment = (walls, a, b) => {
    if (a === b) return walls;
    const exists = walls.segments.some(s => (s.a === a && s.b === b) || (s.a === b && s.b === a));
    if (exists) return walls;
    return { ...walls, segments: [...walls.segments, { id: newId(), a, b }] };
};

// Divide um segmento no parâmetro t, criando um vértice novo ligado às duas metades.
// Curvas são divididas pelo algoritmo de De Casteljau, preservando o formato exato.
export const splitSegment = (walls, segId, t) => {
    const seg = walls.segments.find(s => s.id === segId);
    const verts = vertexMap(walls);
    const a = verts.get(seg?.a), b = verts.get(seg?.b);
    if (!seg || !a || !b) return { walls, vertex: null };
    let point, c1 = null, c2 = null;
    if (seg.c) {
        const p01 = lerp(a, seg.c, t), p12 = lerp(seg.c, b, t);
        point = lerp(p01, p12, t);
        c1 = p01; c2 = p12;
    } else {
        point = lerp(a, b, t);
    }
    const v = { id: newId(), x: point.x, y: point.y };
    // As duas metades herdam as propriedades do trecho original (ex.: porta).
    const { id: _ID, c: _C, ...props } = seg;
    const first = { ...props, id: newId(), a: seg.a, b: v.id, ...(c1 ? { c: c1 } : {}) };
    const second = { ...props, id: newId(), a: v.id, b: seg.b, ...(c2 ? { c: c2 } : {}) };
    return {
        walls: {
            vertices: [...walls.vertices, v],
            segments: walls.segments.flatMap(s => (s.id === segId ? [first, second] : [s]))
        },
        vertex: v
    };
};

export const moveVertex = (walls, id, x, y) => ({
    ...walls,
    vertices: walls.vertices.map(v => (v.id === id ? { ...v, x, y } : v))
});

// Funde dois vértices (usado ao soltar um ponto em cima de outro): as paredes de
// ambos passam a compartilhar o mesmo vértice.
export const mergeVertices = (walls, fromId, intoId) => {
    if (fromId === intoId) return walls;
    const seen = new Set();
    const segments = [];
    walls.segments.forEach(s => {
        const a = s.a === fromId ? intoId : s.a;
        const b = s.b === fromId ? intoId : s.b;
        if (a === b) return;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (seen.has(key) && !s.c) return;
        seen.add(key);
        segments.push({ ...s, a, b });
    });
    return { vertices: walls.vertices.filter(v => v.id !== fromId), segments };
};

const dropOrphans = (walls) => {
    const used = new Set();
    walls.segments.forEach(s => { used.add(s.a); used.add(s.b); });
    return { ...walls, vertices: walls.vertices.filter(v => used.has(v.id)) };
};

export const removeSegment = (walls, segId) => dropOrphans({ ...walls, segments: walls.segments.filter(s => s.id !== segId) });

// Remover um vértice remove as paredes ligadas a ele, sem unir os vizinhos: assim
// dá para abrir vãos (passagens, janelas) no meio de uma parede.
export const removeVertex = (walls, id) => dropOrphans({
    vertices: walls.vertices.filter(v => v.id !== id),
    segments: walls.segments.filter(s => s.a !== id && s.b !== id)
});

// Portas: um trecho de parede que pode ser aberto (deixa a luz passar) e fechado.
export const setSegmentDoor = (walls, segId, isDoor) => ({
    ...walls,
    segments: walls.segments.map(s => {
        if (s.id !== segId) return s;
        if (isDoor) return { ...s, door: true, open: false };
        const rest = { ...s }; delete rest.door; delete rest.open; return rest;
    })
});

export const toggleDoor = (walls, segId) => ({
    ...walls,
    segments: walls.segments.map(s => (s.id === segId && s.door ? { ...s, open: !s.open } : s))
});

export const setSegmentCurve = (walls, segId, midpoint) => {
    const verts = vertexMap(walls);
    return {
        ...walls,
        segments: walls.segments.map(s => {
            if (s.id !== segId) return s;
            if (!midpoint) { const rest = { ...s }; delete rest.c; return rest; }
            return { ...s, c: controlFromMidpoint(verts.get(s.a), midpoint, verts.get(s.b)) };
        })
    };
};

export const translateWalls = (walls, dx, dy) => ({
    vertices: walls.vertices.map(v => ({ ...v, x: v.x + dx, y: v.y + dy })),
    segments: walls.segments.map(s => (s.c ? { ...s, c: { x: s.c.x + dx, y: s.c.y + dy } } : s))
});

export const snapAngle = (from, to, stepDeg = 15) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const step = (stepDeg * Math.PI) / 180;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len };
};

// --- Polígono de visibilidade ----------------------------------------------
// Lança raios do ponto de luz para cada extremidade de parede (e um pouco antes/
// depois dela) e guarda a interseção mais próxima. Só as paredes dentro do alcance
// da luz entram no cálculo.
const EPS = 0.0001;

const raySegment = (ox, oy, dx, dy, s) => {
    const sx = s.x2 - s.x1, sy = s.y2 - s.y1;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-12) return Infinity;
    const qx = s.x1 - ox, qy = s.y1 - oy;
    const t = (qx * sy - qy * sx) / denom;
    const u = (qx * dy - qy * dx) / denom;
    return t > 0 && u >= -1e-9 && u <= 1 + 1e-9 ? t : Infinity;
};

export const computeVisibility = (ox, oy, radius, flatWalls) => {
    const minX = ox - radius, maxX = ox + radius, minY = oy - radius, maxY = oy + radius;
    const segs = flatWalls.filter(s =>
        Math.max(s.x1, s.x2) >= minX && Math.min(s.x1, s.x2) <= maxX &&
        Math.max(s.y1, s.y2) >= minY && Math.min(s.y1, s.y2) <= maxY
    );
    if (segs.length === 0) return null; // sem paredes por perto: luz sem recorte

    const pad = radius * 1.5;
    const bounds = [
        { x1: ox - pad, y1: oy - pad, x2: ox + pad, y2: oy - pad },
        { x1: ox + pad, y1: oy - pad, x2: ox + pad, y2: oy + pad },
        { x1: ox + pad, y1: oy + pad, x2: ox - pad, y2: oy + pad },
        { x1: ox - pad, y1: oy + pad, x2: ox - pad, y2: oy - pad }
    ];
    const all = segs.concat(bounds);

    const angles = [];
    const pushPoint = (x, y) => {
        const a = Math.atan2(y - oy, x - ox);
        angles.push(a - EPS, a, a + EPS);
    };
    all.forEach(s => { pushPoint(s.x1, s.y1); pushPoint(s.x2, s.y2); });
    angles.sort((a, b) => a - b);

    const points = [];
    let lastAngle = null;
    for (const angle of angles) {
        if (lastAngle !== null && angle - lastAngle < 1e-9) continue;
        lastAngle = angle;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        let tMin = Infinity;
        for (let i = 0; i < all.length; i++) {
            const t = raySegment(ox, oy, dx, dy, all[i]);
            if (t < tMin) tMin = t;
        }
        if (tMin < Infinity) points.push(ox + dx * tMin, oy + dy * tMin);
    }
    return points;
};
