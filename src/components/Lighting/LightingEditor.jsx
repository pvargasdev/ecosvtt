import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
    vertexMap, segmentHandle, hitVertex, hitHandle, hitSegment,
    addVertex, addSegment, splitSegment, moveVertex, mergeVertices,
    removeSegment, removeVertex, setSegmentCurve, snapAngle
} from '../../lighting/geometry';
import { createLight } from '../../lighting/model';

// Tolerâncias de clique em pixels de tela (convertidas para o mundo pela escala).
const TOL_LIGHT = 14;
const TOL_VERTEX = 9;
const TOL_HANDLE = 8;
const TOL_SEGMENT = 7;
const HANDLE_DIST = 46;

const WALL_COLOR = '#22d3ee';
const SELECT_COLOR = '#facc15';

const toRad = (deg) => (deg * Math.PI) / 180;

// Editor de iluminação. Fica dentro da camada do mundo (mesma transformação da
// câmera) e recebe os eventos do Board pelos métodos expostos via ref. Todo o teste
// de clique é feito em coordenadas do mundo, com tolerância constante na tela.
const LightingEditor = forwardRef(({ lighting, viewScale, tool, setTool, selection, setSelection, commit, onInteractiveChange }, ref) => {
    const [hover, setHover] = useState(null);
    const [cursor, setCursor] = useState(null);
    const [snapTarget, setSnapTarget] = useState(null);
    const [chain, setChain] = useState(null); // { startId, lastId } ao desenhar paredes
    const dragRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    // Ferramenta de parede: o ponto é criado ao soltar o botão; arrastar antes de soltar
    // curva a parede que está sendo desenhada (como puxar uma corda).
    const pendingWallRef = useRef(null);
    const [curvePreview, setCurvePreview] = useState(null);

    const tol = (px) => px / viewScale;
    const walls = lighting.walls;

    const lightHandles = (light) => {
        const dir = light.type === 'spot' ? toRad(light.direction) : 0;
        const handles = { radius: { x: light.x + Math.cos(dir) * light.radius, y: light.y + Math.sin(dir) * light.radius } };
        if (light.type === 'spot') {
            handles.direction = { x: light.x + Math.cos(dir) * tol(HANDLE_DIST), y: light.y + Math.sin(dir) * tol(HANDLE_DIST) };
        }
        return handles;
    };

    const near = (a, b, px) => Math.hypot(a.x - b.x, a.y - b.y) <= tol(px);

    const hitLight = (p) => {
        let best = null, bestD = tol(TOL_LIGHT);
        lighting.lights.forEach(l => {
            const d = Math.hypot(l.x - p.x, l.y - p.y);
            if (d <= bestD) { best = l; bestD = d; }
        });
        return best;
    };

    // O que está sob o cursor, na ordem de prioridade da ferramenta de seleção.
    const pick = (p) => {
        const selLight = selection?.kind === 'light' ? lighting.lights.find(l => l.id === selection.id) : null;
        if (selLight) {
            const h = lightHandles(selLight);
            if (h.direction && near(h.direction, p, TOL_HANDLE)) return { kind: 'lightDirection', id: selLight.id };
            if (near(h.radius, p, TOL_HANDLE)) return { kind: 'lightRadius', id: selLight.id };
        }
        const light = hitLight(p);
        if (light) return { kind: 'light', id: light.id };
        const v = hitVertex(walls, p, tol(TOL_VERTEX));
        if (v) return { kind: 'vertex', id: v.id };
        const handleSeg = hitHandle(walls, p, tol(TOL_HANDLE));
        if (handleSeg) return { kind: 'curve', id: handleSeg.id };
        const seg = hitSegment(walls, p, tol(TOL_SEGMENT));
        if (seg) return { kind: 'segment', id: seg.segId, t: seg.t, point: seg.point };
        return null;
    };

    // Onde um novo ponto de parede vai cair: num vértice existente, sobre uma parede
    // existente (que será dividida) ou num ponto livre (com Shift: ângulos de 15°).
    const resolveWallPoint = (p, shiftKey) => {
        const v = hitVertex(walls, p, tol(TOL_VERTEX));
        if (v) return { kind: 'vertex', id: v.id, x: v.x, y: v.y };
        const seg = hitSegment(walls, p, tol(TOL_SEGMENT));
        if (seg) return { kind: 'segment', segId: seg.segId, t: seg.t, x: seg.point.x, y: seg.point.y };
        if (shiftKey && chain) {
            const last = vertexMap(walls).get(chain.lastId);
            if (last) { const s = snapAngle(last, p); return { kind: 'free', x: s.x, y: s.y }; }
        }
        return { kind: 'free', x: p.x, y: p.y };
    };

    const startDrag = (drag) => {
        dragRef.current = drag;
        setIsDragging(true);
        onInteractiveChange(true);
    };

    const endDrag = () => {
        if (!dragRef.current) return;
        dragRef.current = null;
        setIsDragging(false);
        setSnapTarget(null);
        onInteractiveChange(false);
    };

    const finishChain = () => { setChain(null); setSnapTarget(null); };

    const deleteSelection = () => {
        if (!selection) return false;
        if (selection.kind === 'light') commit(l => ({ ...l, lights: l.lights.filter(x => x.id !== selection.id) }));
        else if (selection.kind === 'segment') commit(l => ({ ...l, walls: removeSegment(l.walls, selection.id) }));
        else if (selection.kind === 'vertex') commit(l => ({ ...l, walls: removeVertex(l.walls, selection.id) }));
        else return false;
        setSelection(null);
        return true;
    };

    // Controle de uma Bézier quadrática que faz a curva passar pelo ponto p no parâmetro t.
    const controlThrough = (a, b, p, t) => {
        const u = 1 - t;
        return { x: (p.x - u * u * a.x - t * t * b.x) / (2 * u * t), y: (p.y - u * u * a.y - t * t * b.y) / (2 * u * t) };
    };

    const addWallPoint = (r, bendThrough) => {
        // O grafo novo é calculado aqui (fora do setState) para os IDs gerados serem estáveis.
        let w = walls;
        let id;
        if (r.kind === 'vertex') id = r.id;
        else if (r.kind === 'segment') { const res = splitSegment(w, r.segId, r.t); w = res.walls; id = res.vertex.id; }
        else { const res = addVertex(w, r.x, r.y); w = res.walls; id = res.vertex.id; }
        if (chain?.lastId && w.vertices.some(v => v.id === chain.lastId) && chain.lastId !== id) {
            const before = w.segments.length;
            w = addSegment(w, chain.lastId, id);
            if (bendThrough && w.segments.length > before) {
                const segId = w.segments[w.segments.length - 1].id;
                w = setSegmentCurve(w, segId, bendThrough);
            }
        }
        commit(l => ({ ...l, walls: w }));
        const closesLoop = !!chain && id === chain.startId && chain.lastId !== chain.startId;
        if (closesLoop) finishChain();
        else setChain({ startId: chain?.startId ?? id, lastId: id });
    };

    // Itens selecionados em formato copiável (coordenadas absolutas, sem IDs).
    const copySelection = () => {
        if (selection?.kind === 'light') {
            const light = lighting.lights.find(l => l.id === selection.id);
            return light ? { lights: [light], segments: [] } : null;
        }
        if (selection?.kind === 'segment') {
            const seg = walls.segments.find(sg => sg.id === selection.id);
            const verts = vertexMap(walls);
            if (!seg) return null;
            return { lights: [], segments: [{ a: { ...verts.get(seg.a) }, b: { ...verts.get(seg.b) }, c: seg.c ? { ...seg.c } : null }] };
        }
        return null;
    };

    useImperativeHandle(ref, () => ({
        // true = o editor tratou o clique (o Board não deve mover a câmera).
        pointerDown(p, e) {
            if (tool === 'wall') {
                pendingWallRef.current = { point: resolveWallPoint(p, e.shiftKey), start: p };
                e.preventDefault();
                return true;
            }
            if (tool !== 'select') return false;
            const target = pick(p);
            if (!target) { setSelection(null); return false; }

            if (target.kind === 'light') {
                const light = lighting.lights.find(l => l.id === target.id);
                setSelection({ kind: 'light', id: light.id });
                startDrag({ kind: 'light', id: light.id, dx: light.x - p.x, dy: light.y - p.y });
            } else if (target.kind === 'lightRadius' || target.kind === 'lightDirection') {
                startDrag({ kind: target.kind, id: target.id });
            } else if (target.kind === 'vertex') {
                setSelection({ kind: 'vertex', id: target.id });
                startDrag({ kind: 'vertex', id: target.id });
            } else if (target.kind === 'curve') {
                setSelection({ kind: 'segment', id: target.id });
                startDrag({ kind: 'curve', id: target.id });
            } else if (target.kind === 'segment') {
                setSelection({ kind: 'segment', id: target.id });
                const seg = walls.segments.find(s => s.id === target.id);
                const verts = vertexMap(walls);
                if (e.shiftKey) {
                    // Shift + arrastar: move a parede inteira.
                    startDrag({
                        kind: 'segment', id: target.id, start: p,
                        a: { ...verts.get(seg.a) }, b: { ...verts.get(seg.b) }, c: seg.c ? { ...seg.c } : null
                    });
                } else {
                    // Arrastar a parede a curva no ponto onde ela foi agarrada.
                    startDrag({ kind: 'bend', id: target.id, t: Math.min(0.85, Math.max(0.15, target.t)) });
                }
            }
            e.preventDefault();
            return true;
        },

        pointerMove(p, e) {
            setCursor(p);
            const drag = dragRef.current;
            const pending = pendingWallRef.current;
            if (tool === 'wall' && pending) {
                const moved = Math.hypot(p.x - pending.start.x, p.y - pending.start.y) > tol(5);
                setCurvePreview(moved && chain?.lastId ? { through: p, end: pending.point } : null);
                return;
            }
            if (!drag) {
                if (tool === 'select') setHover(pick(p));
                else if (tool === 'wall') {
                    const r = resolveWallPoint(p, e.shiftKey);
                    setSnapTarget(r.kind === 'free' ? null : r);
                    setHover(null);
                } else setHover(null);
                return;
            }

            if (drag.kind === 'light') {
                commit(l => ({ ...l, lights: l.lights.map(x => (x.id === drag.id ? { ...x, x: p.x + drag.dx, y: p.y + drag.dy } : x)) }));
            } else if (drag.kind === 'lightRadius') {
                commit(l => ({ ...l, lights: l.lights.map(x => (x.id === drag.id ? { ...x, radius: Math.max(20, Math.round(Math.hypot(p.x - x.x, p.y - x.y))) } : x)) }));
            } else if (drag.kind === 'lightDirection') {
                commit(l => ({ ...l, lights: l.lights.map(x => {
                    if (x.id !== drag.id) return x;
                    let deg = (Math.atan2(p.y - x.y, p.x - x.x) * 180) / Math.PI;
                    if (e.shiftKey) deg = Math.round(deg / 15) * 15;
                    return { ...x, direction: Math.round(deg) };
                }) }));
            } else if (drag.kind === 'vertex') {
                // Ao passar sobre outro vértice, o ponto "gruda" nele e os dois são fundidos ao soltar.
                const other = hitVertex(walls, p, tol(TOL_VERTEX), drag.id);
                setSnapTarget(other ? { kind: 'vertex', id: other.id, x: other.x, y: other.y } : null);
                const target = other ? { x: other.x, y: other.y } : p;
                commit(l => ({ ...l, walls: moveVertex(l.walls, drag.id, target.x, target.y) }));
            } else if (drag.kind === 'curve') {
                commit(l => ({ ...l, walls: setSegmentCurve(l.walls, drag.id, p) }));
            } else if (drag.kind === 'bend') {
                commit(l => {
                    const verts = vertexMap(l.walls);
                    return { ...l, walls: { ...l.walls, segments: l.walls.segments.map(sg => {
                        if (sg.id !== drag.id) return sg;
                        const a = verts.get(sg.a), b = verts.get(sg.b);
                        return a && b ? { ...sg, c: controlThrough(a, b, p, drag.t) } : sg;
                    }) } };
                });
            } else if (drag.kind === 'segment') {
                const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
                commit(l => {
                    const seg = l.walls.segments.find(s => s.id === drag.id);
                    if (!seg) return l;
                    let w = moveVertex(l.walls, seg.a, drag.a.x + dx, drag.a.y + dy);
                    w = moveVertex(w, seg.b, drag.b.x + dx, drag.b.y + dy);
                    if (drag.c) w = { ...w, segments: w.segments.map(s => (s.id === drag.id ? { ...s, c: { x: drag.c.x + dx, y: drag.c.y + dy } } : s)) };
                    return { ...l, walls: w };
                });
            }
        },

        pointerUp() {
            const pending = pendingWallRef.current;
            if (pending) {
                pendingWallRef.current = null;
                const bend = curvePreview?.through || null;
                setCurvePreview(null);
                addWallPoint(pending.point, bend);
                return;
            }
            const drag = dragRef.current;
            if (drag?.kind === 'vertex' && snapTarget?.kind === 'vertex') {
                const into = snapTarget.id;
                commit(l => ({ ...l, walls: mergeVertices(l.walls, drag.id, into) }));
                setSelection({ kind: 'vertex', id: into });
            }
            endDrag();
        },

        // Clique sem arrastar (as ferramentas de criação usam isso; arrastar move a câmera).
        click(p) {
            if (tool === 'point' || tool === 'spot') {
                const light = createLight(tool, Math.round(p.x), Math.round(p.y));
                commit(l => ({ ...l, lights: [...l.lights, light] }));
                setSelection({ kind: 'light', id: light.id });
                setTool('select');
                return;
            }
        },

        doubleClick(p) {
            if (tool === 'wall') { finishChain(); return; }
            if (tool !== 'select') return;
            const handleSeg = hitHandle(walls, p, tol(TOL_HANDLE));
            if (handleSeg?.c) { commit(l => ({ ...l, walls: setSegmentCurve(l.walls, handleSeg.id, null) })); return; }
            const seg = hitSegment(walls, p, tol(TOL_SEGMENT));
            if (seg) {
                const res = splitSegment(walls, seg.segId, seg.t);
                commit(l => ({ ...l, walls: res.walls }));
                if (res.vertex) setSelection({ kind: 'vertex', id: res.vertex.id });
            }
        },

        keyDown(e) {
            const key = e.key.toLowerCase();
            if (key === 'escape') {
                if (chain) finishChain(); else setSelection(null);
                return true;
            }
            if (key === 'enter' && chain) { finishChain(); return true; }
            if ((key === 'delete' || key === 'backspace') && deleteSelection()) return true;
            const tools = { v: 'select', w: 'wall', l: 'point', h: 'spot' };
            if (tools[key] && !e.ctrlKey && !e.metaKey) { finishChain(); setTool(tools[key]); return true; }
            return false;
        },

        cancel() { finishChain(); endDrag(); setHover(null); },
        copySelection,
        deleteSelection,
        getCursor: () => cursor,
        // Inclui o ponto de parede pendente, para o Board repassar o mouseup mesmo fora do tabuleiro.
        isDragging: () => !!dragRef.current || !!pendingWallRef.current
    }));

    // ------------------------------------------------------------------ render
    const verts = vertexMap(walls);
    const px = (n) => n / viewScale;
    const isSelected = (kind, id) => selection?.kind === kind && selection.id === id;
    const isHovered = (kind, id) => hover?.kind === kind && hover.id === id;
    const lastVertex = chain ? verts.get(chain.lastId) : null;
    const previewPoint = snapTarget || cursor;

    return (
        <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ zIndex: 40 }} width="1" height="1">
            {walls.segments.map(seg => {
                const a = verts.get(seg.a), b = verts.get(seg.b);
                if (!a || !b) return null;
                const d = seg.c ? `M${a.x},${a.y} Q${seg.c.x},${seg.c.y} ${b.x},${b.y}` : `M${a.x},${a.y} L${b.x},${b.y}`;
                const selected = isSelected('segment', seg.id);
                const hovered = isHovered('segment', seg.id) || isHovered('curve', seg.id);
                return (
                    <g key={seg.id}>
                        <path d={d} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        <path d={d} fill="none" stroke={selected ? SELECT_COLOR : WALL_COLOR} strokeOpacity={hovered || selected ? 1 : 0.85} strokeWidth={hovered || selected ? 3.5 : 2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </g>
                );
            })}

            {tool === 'select' && walls.segments.map(seg => {
                const a = verts.get(seg.a), b = verts.get(seg.b);
                if (!a || !b) return null;
                const showHandle = isHovered('segment', seg.id) || isHovered('curve', seg.id) || isSelected('segment', seg.id);
                if (!showHandle) return null;
                const h = segmentHandle(seg, a, b);
                const active = isHovered('curve', seg.id) || isSelected('segment', seg.id);
                const size = px(active ? 5 : 3.5);
                return (
                    <rect key={`h-${seg.id}`} x={h.x - size} y={h.y - size} width={size * 2} height={size * 2}
                        transform={`rotate(45 ${h.x} ${h.y})`}
                        fill={seg.c ? WALL_COLOR : 'rgba(10,10,12,0.9)'} stroke={WALL_COLOR} strokeWidth={1.5} vectorEffect="non-scaling-stroke"
                        opacity={active ? 1 : 0.7} />
                );
            })}

            {walls.vertices.map(v => {
                const selected = isSelected('vertex', v.id);
                const hovered = isHovered('vertex', v.id) || (snapTarget?.kind === 'vertex' && snapTarget.id === v.id);
                return (
                    <circle key={v.id} cx={v.x} cy={v.y} r={px(selected || hovered ? 6 : 4.5)}
                        fill={selected ? SELECT_COLOR : '#0a0a0c'} stroke={selected ? SELECT_COLOR : WALL_COLOR} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                );
            })}

            {tool === 'wall' && lastVertex && curvePreview && (() => {
                const { end, through } = curvePreview;
                const c = { x: 2 * through.x - (lastVertex.x + end.x) / 2, y: 2 * through.y - (lastVertex.y + end.y) / 2 };
                return <path d={`M${lastVertex.x},${lastVertex.y} Q${c.x},${c.y} ${end.x},${end.y}`} fill="none" stroke={WALL_COLOR} strokeWidth={2.5} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />;
            })()}
            {tool === 'wall' && lastVertex && previewPoint && !curvePreview && (
                <line x1={lastVertex.x} y1={lastVertex.y} x2={previewPoint.x} y2={previewPoint.y}
                    stroke={WALL_COLOR} strokeWidth={2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" opacity={0.9} />
            )}
            {snapTarget && (tool === 'wall' || isDragging) && (
                <circle cx={snapTarget.x} cy={snapTarget.y} r={px(11)} fill="none" stroke={SELECT_COLOR} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            )}
            {tool === 'wall' && !lastVertex && cursor && !snapTarget && (
                <circle cx={cursor.x} cy={cursor.y} r={px(4)} fill={WALL_COLOR} opacity={0.6} />
            )}

            {lighting.lights.map(light => {
                const selected = isSelected('light', light.id);
                const hovered = isHovered('light', light.id);
                const dir = toRad(light.direction);
                const half = toRad(light.angle) / 2;
                const r = light.radius;
                const conePath = light.type === 'spot'
                    ? `M${light.x},${light.y} L${light.x + Math.cos(dir - half) * r},${light.y + Math.sin(dir - half) * r} A${r},${r} 0 ${half * 2 > Math.PI ? 1 : 0} 1 ${light.x + Math.cos(dir + half) * r},${light.y + Math.sin(dir + half) * r} Z`
                    : null;
                const handles = selected ? lightHandles(light) : null;
                return (
                    <g key={light.id} opacity={light.enabled ? 1 : 0.45}>
                        {(selected || hovered) && (light.type === 'spot'
                            ? <path d={conePath} fill="none" stroke={light.color} strokeWidth={1.5} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                            : <circle cx={light.x} cy={light.y} r={r} fill="none" stroke={light.color} strokeWidth={1.5} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                        )}
                        <circle cx={light.x} cy={light.y} r={px(selected ? 11 : 9)} fill={light.color} stroke={selected ? SELECT_COLOR : '#ffffff'} strokeWidth={selected ? 3 : 2} vectorEffect="non-scaling-stroke" />
                        {light.type === 'spot' && (
                            <line x1={light.x} y1={light.y} x2={light.x + Math.cos(dir) * px(16)} y2={light.y + Math.sin(dir) * px(16)} stroke="#0a0a0c" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        )}
                        {handles?.direction && (
                            <>
                                <line x1={light.x} y1={light.y} x2={handles.direction.x} y2={handles.direction.y} stroke={SELECT_COLOR} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                                <circle cx={handles.direction.x} cy={handles.direction.y} r={px(isHovered('lightDirection', light.id) ? 7 : 5.5)} fill={SELECT_COLOR} stroke="#0a0a0c" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                            </>
                        )}
                        {handles && (
                            <circle cx={handles.radius.x} cy={handles.radius.y} r={px(isHovered('lightRadius', light.id) ? 7 : 5.5)} fill="#0a0a0c" stroke={SELECT_COLOR} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                        )}
                    </g>
                );
            })}
        </svg>
    );
});

LightingEditor.displayName = 'LightingEditor';

export default LightingEditor;
