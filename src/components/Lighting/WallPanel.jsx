import React from 'react';
import { Spline, Minus, Scissors, Trash2, Copy, CircleDot, DoorClosed, DoorOpen, BrickWall } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { vertexMap, splitSegment, setSegmentCurve, removeSegment, removeVertex, setSegmentDoor, toggleDoor } from '../../lighting/geometry';

const ActionButton = ({ icon, label, shortcut, onClick, danger }) => {
    const Icon = icon;
    return (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs transition ${danger ? 'text-red-400 hover:bg-red-500/15' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
    >
        <Icon size={14} className="shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {shortcut && <kbd className="rounded border border-white/15 bg-white/10 px-1 font-mono text-[10px] text-gray-400">{shortcut}</kbd>}
    </button>
    );
};

// Ações da parede ou do ponto selecionado, para que curvar, endireitar, dividir e
// excluir não dependam de atalhos escondidos.
const WallPanel = ({ lighting, selection, setLighting, onSelect, onCopy }) => {
    const t = useTranslation();
    const walls = lighting.walls;
    const isSegment = selection.kind === 'segment';
    const seg = isSegment ? walls.segments.find(s => s.id === selection.id) : null;
    const vertex = !isSegment ? walls.vertices.find(v => v.id === selection.id) : null;
    if (!seg && !vertex) return null;

    const verts = vertexMap(walls);

    const straighten = () => setLighting(l => ({ ...l, walls: setSegmentCurve(l.walls, seg.id, null) }));
    const curve = () => {
        // Curva suave para um dos lados; depois é só arrastar a parede para ajustar.
        const a = verts.get(seg.a), b = verts.get(seg.b);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const nx = -(b.y - a.y) / (len || 1), ny = (b.x - a.x) / (len || 1);
        const mid = { x: (a.x + b.x) / 2 + nx * len * 0.2, y: (a.y + b.y) / 2 + ny * len * 0.2 };
        setLighting(l => ({ ...l, walls: setSegmentCurve(l.walls, seg.id, mid) }));
    };
    const split = () => {
        const res = splitSegment(walls, seg.id, 0.5);
        setLighting(l => ({ ...l, walls: res.walls }));
        if (res.vertex) onSelect({ kind: 'vertex', id: res.vertex.id });
    };
    const setDoor = (isDoor) => setLighting(l => ({ ...l, walls: setSegmentDoor(l.walls, seg.id, isDoor) }));
    const toggleOpen = () => setLighting(l => ({ ...l, walls: toggleDoor(l.walls, seg.id) }));
    const remove = () => {
        setLighting(l => ({ ...l, walls: isSegment ? removeSegment(l.walls, seg.id) : removeVertex(l.walls, vertex.id) }));
        onSelect(null);
    };

    const linkedCount = vertex ? walls.segments.filter(s => s.a === vertex.id || s.b === vertex.id).length : 0;

    return (
        <div
            data-ecos-window="true"
            data-ecos-ui="true"
            className="absolute top-[8.75rem] right-4 w-64 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-50 pointer-events-auto cursor-default animate-in fade-in"
            onMouseDown={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
        >
            <div className="p-3 border-b border-glass-border bg-white/5 rounded-t-xl flex items-center gap-2">
                {isSegment
                    ? (seg.door ? <DoorClosed size={16} className="text-amber-400" /> : <Spline size={16} className="text-cyan-400" />)
                    : <CircleDot size={16} className="text-cyan-400" />}
                <h3 className="font-rajdhani font-bold text-white">{isSegment ? (seg.door ? t('lighting.door.title') : t('lighting.wall.title')) : t('lighting.wall.pointTitle')}</h3>
                <span className="ml-auto text-[10px] font-bold uppercase text-text-muted">
                    {isSegment
                        ? (seg.door ? (seg.open ? t('lighting.door.isOpen') : t('lighting.door.isClosed')) : (seg.c ? t('lighting.wall.curved') : t('lighting.wall.straight')))
                        : t('lighting.wall.links', { count: linkedCount })}
                </span>
            </div>
            <div className="p-2 space-y-0.5 bg-black/20 rounded-b-xl">
                {isSegment && (
                    <>
                        {seg.door ? (
                            <>
                                <ActionButton icon={seg.open ? DoorClosed : DoorOpen} label={seg.open ? t('lighting.door.close') : t('lighting.door.open')} onClick={toggleOpen} />
                                <ActionButton icon={BrickWall} label={t('lighting.door.makeWall')} onClick={() => setDoor(false)} />
                            </>
                        ) : (
                            <ActionButton icon={DoorClosed} label={t('lighting.door.make')} onClick={() => setDoor(true)} />
                        )}
                        <div className="my-1 h-px bg-white/5" />
                        {seg.c
                            ? <ActionButton icon={Minus} label={t('lighting.wall.straighten')} onClick={straighten} />
                            : <ActionButton icon={Spline} label={t('lighting.wall.curve')} onClick={curve} />}
                        <ActionButton icon={Scissors} label={t('lighting.wall.split')} onClick={split} />
                        <ActionButton icon={Copy} label={t('lighting.wall.duplicate')} shortcut="Ctrl+D" onClick={onCopy} />
                    </>
                )}
                <ActionButton icon={Trash2} label={isSegment ? t('lighting.wall.delete') : t('lighting.wall.deletePoint')} shortcut="Del" onClick={remove} danger />
                <p className="px-3 pt-2 pb-1 text-[10px] leading-relaxed text-text-muted">
                    {isSegment ? (seg.door ? t('lighting.door.tip') : t('lighting.wall.tip')) : t('lighting.wall.pointTip')}
                </p>
            </div>
        </div>
    );
};

export default WallPanel;
