import React from 'react';
import { DoorClosed, DoorOpen } from 'lucide-react';
import { vertexMap, segmentHandle } from '../../lighting/geometry';
import { useTranslation } from '../../i18n';

const BUTTON_SIZE = 30;

// Botões redondos sobre cada porta, só na tela do mestre e fora do editor de luz.
// Clicar abre/fecha a porta: aberta, o trecho deixa de bloquear a luz.
const DoorControls = ({ walls, viewScale, onToggle }) => {
    const t = useTranslation();
    const doors = walls.segments.filter(s => s.door);
    if (!doors.length) return null;
    const verts = vertexMap(walls);
    const size = BUTTON_SIZE / viewScale;

    return doors.map(seg => {
        const a = verts.get(seg.a), b = verts.get(seg.b);
        if (!a || !b) return null;
        const h = segmentHandle(seg, a, b);
        const Icon = seg.open ? DoorOpen : DoorClosed;
        return (
            <button
                key={seg.id}
                data-ecos-door="true"
                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                onDoubleClick={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onToggle(seg.id); }}
                title={seg.open ? t('lighting.door.close') : t('lighting.door.open')}
                className={`absolute flex items-center justify-center rounded-full border-2 shadow-lg transition-colors ${seg.open
                    ? 'border-emerald-400/80 bg-emerald-950/85 text-emerald-300 hover:bg-emerald-900'
                    : 'border-amber-400/80 bg-black/85 text-amber-300 hover:bg-amber-950'}`}
                style={{
                    left: h.x - size / 2, top: h.y - size / 2, width: size, height: size,
                    borderWidth: 2 / viewScale, zIndex: 25
                }}
            >
                <Icon size={16 / viewScale} strokeWidth={2} />
            </button>
        );
    });
};

export default DoorControls;
