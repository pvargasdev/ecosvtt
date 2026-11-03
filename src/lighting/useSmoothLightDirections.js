import { useEffect, useMemo, useRef, useState } from 'react';

// Mesma duração e curva da rotação do token (Token.jsx), para a lanterna girar junto.
const DURATION = 400;

// cubic-bezier(0.25, 0.46, 0.45, 0.94)
const bezier = (p1x, p1y, p2x, p2y) => {
    const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;
    const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
        let t = x;
        for (let i = 0; i < 6; i++) {
            const d = slopeX(t);
            if (Math.abs(d) < 1e-6) break;
            t -= (sampleX(t) - x) / d;
        }
        return sampleY(Math.min(1, Math.max(0, t)));
    };
};
const ease = bezier(0.25, 0.46, 0.45, 0.94);

// Anima a direção dos holofotes quando ela muda (Shift+Q/E ou rotação do token), em
// vez de saltar. Retorna as luzes com a direção do momento e se há animação rodando.
export const useSmoothLightDirections = (lights) => {
    const [frame, setFrame] = useState({ values: new Map(), animating: false });
    const currentRef = useRef(new Map()); // id -> direção exibida
    const animRef = useRef(new Map());    // id -> { from, to, target, start }

    useEffect(() => {
        const now = performance.now();
        const ids = new Set();
        lights.forEach(l => {
            if (l.type !== 'spot') return;
            ids.add(l.id);
            const cur = currentRef.current.get(l.id);
            if (cur === undefined) { currentRef.current.set(l.id, l.direction); return; }
            const anim = animRef.current.get(l.id);
            const target = anim ? anim.target : cur;
            if (target === l.direction) return;
            // Caminho mais curto (o controle deslizante pode pular de 359° para 0°).
            const delta = ((((l.direction - cur) % 360) + 540) % 360) - 180;
            animRef.current.set(l.id, { from: cur, to: cur + delta, target: l.direction, start: now });
        });
        currentRef.current.forEach((_, id) => { if (!ids.has(id)) { currentRef.current.delete(id); animRef.current.delete(id); } });
        if (!animRef.current.size) return;

        let raf;
        const tick = (t) => {
            animRef.current.forEach((a, id) => {
                const k = Math.min(1, Math.max(0, (t - a.start) / DURATION));
                currentRef.current.set(id, k >= 1 ? a.target : a.from + (a.to - a.from) * ease(k));
                if (k >= 1) animRef.current.delete(id);
            });
            const animating = animRef.current.size > 0;
            setFrame({ values: new Map(currentRef.current), animating });
            if (animating) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [lights]);

    const smoothLights = useMemo(() => lights.map(l => {
        if (l.type !== 'spot') return l;
        const value = frame.values.get(l.id);
        return value === undefined ? l : { ...l, direction: value };
    }), [lights, frame]);

    return { lights: smoothLights, animating: frame.animating };
};
