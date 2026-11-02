import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MousePointer2, Spline, Lightbulb, Flashlight, Sun, Eye, EyeOff, Power } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { AMBIENT_PRESETS } from '../../lighting/model';

const ToolButton = ({ active, disabled, onClick, title, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-2 rounded transition ${active ? 'bg-white/20 text-yellow-300' : 'text-text-muted hover:bg-white/10 hover:text-white'} disabled:opacity-30 disabled:pointer-events-none`}
    >
        {children}
    </button>
);

// Painel da iluminação base (aberto pelo botão do sol).
const AmbientPopover = ({ anchorRef, position, lighting, setLighting, onClose }) => {
    const t = useTranslation();
    const panelRef = useRef(null);

    useEffect(() => {
        const onDown = (e) => {
            if (anchorRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            onClose();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [anchorRef, onClose]);

    const level = Math.round(lighting.ambientLevel * 100);

    return createPortal(
        <div
            ref={panelRef}
            data-ecos-window="true"
            data-ecos-ui="true"
            onMouseDown={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left }}
            className="w-64 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-[60] overflow-hidden animate-in fade-in pointer-events-auto cursor-default"
        >
            <div className="p-3 border-b border-glass-border bg-white/5 flex items-center gap-2">
                <Sun size={14} className="text-yellow-300" />
                <h3 className="font-rajdhani font-bold text-white text-sm">{t('lighting.ambientTitle')}</h3>
            </div>
            <div className="p-3 space-y-4 bg-black/20">
                <div className="grid grid-cols-4 gap-1.5">
                    {AMBIENT_PRESETS.map(p => {
                        const active = Math.abs(lighting.ambientLevel - p.level) < 0.01 && lighting.ambientColor.toLowerCase() === p.color;
                        return (
                            <button
                                key={p.key}
                                onClick={() => setLighting(l => ({ ...l, ambientLevel: p.level, ambientColor: p.color }))}
                                className={`flex flex-col items-center gap-1 py-2 rounded border text-[10px] font-bold uppercase transition ${active ? 'border-yellow-300/70 bg-yellow-300/10 text-white' : 'border-white/5 text-text-muted hover:text-white hover:border-white/20'}`}
                            >
                                <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: p.color, opacity: 0.25 + p.level * 0.75 }} />
                                {t(`lighting.presets.${p.key}`)}
                            </button>
                        );
                    })}
                </div>
                <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase text-text-muted mb-1.5">
                        <span>{t('lighting.ambientLevel')}</span><span className="text-white font-mono">{level}%</span>
                    </div>
                    <input
                        type="range" min="0" max="100" value={level}
                        onChange={e => setLighting(l => ({ ...l, ambientLevel: Number(e.target.value) / 100 }))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-300"
                    />
                </div>
                <label className="flex items-center justify-between text-[10px] font-bold uppercase text-text-muted cursor-pointer">
                    {t('lighting.ambientColor')}
                    <span className="relative w-7 h-7 rounded-full border border-white/20 overflow-hidden" style={{ background: lighting.ambientColor }}>
                        <input type="color" value={lighting.ambientColor} onChange={e => setLighting(l => ({ ...l, ambientColor: e.target.value }))} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </span>
                </label>
            </div>
        </div>,
        document.body
    );
};

// Conteúdo da barra superior quando o modo de iluminação está ativo.
const LightingToolbar = ({ lighting, setLighting, tool, setTool, previewAsPlayer, setPreviewAsPlayer }) => {
    const t = useTranslation();
    const [ambientOpen, setAmbientOpen] = useState(false);
    const [ambientPos, setAmbientPos] = useState({ top: 0, left: 0 });
    const sunRef = useRef(null);

    const toggleAmbient = () => {
        if (!ambientOpen && sunRef.current) {
            const rect = sunRef.current.getBoundingClientRect();
            setAmbientPos({ top: rect.bottom + 10, left: Math.max(8, Math.min(rect.left - 100, window.innerWidth - 268)) });
        }
        setAmbientOpen(o => !o);
    };
    const enabled = lighting.enabled;

    return (
        <div className="flex-1 flex items-center gap-1 px-1 w-full">
            <button
                onClick={() => setLighting(l => ({ ...l, enabled: !l.enabled }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-wider transition shrink-0 ${enabled ? 'border-yellow-300/60 bg-yellow-300/10 text-yellow-300' : 'border-glass-border text-text-muted hover:text-white'}`}
                title={enabled ? t('lighting.disableTitle') : t('lighting.enableTitle')}
            >
                <Power size={14} /> {enabled ? t('lighting.on') : t('lighting.off')}
            </button>

            <div className="w-px h-6 bg-glass-border mx-1" />

            {!enabled ? (
                <span className="text-[11px] text-text-muted px-2 truncate">{t('lighting.offHint')}</span>
            ) : (
                <>
                    <ToolButton active={tool === 'select'} onClick={() => setTool('select')} title={t('lighting.tools.select')}><MousePointer2 size={18} /></ToolButton>
                    <ToolButton active={tool === 'wall'} onClick={() => setTool('wall')} title={t('lighting.tools.wall')}><Spline size={18} /></ToolButton>
                    <ToolButton active={tool === 'point'} onClick={() => setTool('point')} title={t('lighting.tools.point')}><Lightbulb size={18} /></ToolButton>
                    <ToolButton active={tool === 'spot'} onClick={() => setTool('spot')} title={t('lighting.tools.spot')}><Flashlight size={18} /></ToolButton>

                    <div className="w-px h-6 bg-glass-border mx-1" />

                    <button
                        ref={sunRef}
                        onClick={toggleAmbient}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded transition ${ambientOpen ? 'bg-white/20 text-white' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}
                        title={t('lighting.ambientTitle')}
                    >
                        <Sun size={16} className="text-yellow-300" />
                        <span className="text-xs font-mono font-bold">{Math.round(lighting.ambientLevel * 100)}%</span>
                        <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: lighting.ambientColor }} />
                    </button>

                    <div className="ml-auto flex items-center gap-1">
                        <span className="text-[10px] text-text-muted font-bold uppercase whitespace-nowrap hidden xl:inline">
                            {t('lighting.stats', { lights: lighting.lights.length, walls: lighting.walls.segments.length })}
                        </span>
                        <ToolButton active={previewAsPlayer} onClick={() => setPreviewAsPlayer(p => !p)} title={t('lighting.previewAsPlayer')}>
                            {previewAsPlayer ? <Eye size={18} /> : <EyeOff size={18} />}
                        </ToolButton>
                    </div>
                </>
            )}

            {ambientOpen && enabled && (
                <AmbientPopover anchorRef={sunRef} position={ambientPos} lighting={lighting} setLighting={setLighting} onClose={() => setAmbientOpen(false)} />
            )}
        </div>
    );
};

export default LightingToolbar;
