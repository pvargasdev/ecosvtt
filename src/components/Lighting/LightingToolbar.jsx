import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Move, Spline, Flashlight, Sun, Eye, EyeOff, Contrast } from 'lucide-react';
import { SegmentedControl, Switch, ToolbarButton, ToolbarDivider, TipButton } from '../VTT/Toolbar/ToolbarParts';
import { useTranslation } from '../../i18n';
import { AMBIENT_PRESETS } from '../../lighting/model';
import { MODE_ACCENTS } from '../VTT/Toolbar/theme';

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
                <Contrast size={14} className="text-yellow-300" />
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

const LIGHT_ACCENT = MODE_ACCENTS.lighting;

// Conteúdo da barra contextual do modo de iluminação.
const LightingToolbar = ({ lighting, setLighting, tool, setTool, previewAsPlayer, setPreviewAsPlayer }) => {
    const t = useTranslation();
    const [ambientOpen, setAmbientOpen] = useState(false);
    const [ambientPos, setAmbientPos] = useState({ top: 0, left: 0 });
    const ambientRef = useRef(null);
    const enabled = lighting.enabled;

    const toggleAmbient = () => {
        if (!ambientOpen && ambientRef.current) {
            const rect = ambientRef.current.getBoundingClientRect();
            setAmbientPos({ top: rect.bottom + 10, left: Math.max(8, Math.min(rect.left - 100, window.innerWidth - 268)) });
        }
        setAmbientOpen(o => !o);
    };

    return (
        <div className="flex items-center gap-1">
            <Switch
                checked={enabled}
                onChange={(v) => setLighting(l => ({ ...l, enabled: v }))}
                label={enabled ? t('lighting.on') : t('lighting.off')}
                accent={LIGHT_ACCENT}
                title={enabled ? t('lighting.disableTitle') : t('lighting.enableTitle')}
            />

            {!enabled ? (
                <>
                    <ToolbarDivider />
                    <span className="max-w-[280px] truncate px-2 text-[11px] text-text-muted">{t('lighting.offHint')}</span>
                </>
            ) : (
                <>
                    <ToolbarDivider />
                    <SegmentedControl
                        value={tool}
                        onChange={setTool}
                        items={[
                            { id: 'select', icon: Move, label: t('lighting.tools.select'), shortcut: 'V', accent: LIGHT_ACCENT },
                            { id: 'wall', icon: Spline, label: t('lighting.tools.wall'), shortcut: 'W', accent: '#22d3ee' },
                            { id: 'point', icon: Sun, label: t('lighting.tools.point'), shortcut: 'L', accent: LIGHT_ACCENT },
                            { id: 'spot', icon: Flashlight, label: t('lighting.tools.spot'), shortcut: 'H', accent: LIGHT_ACCENT }
                        ]}
                    />

                    <ToolbarDivider />
                    <div ref={ambientRef}>
                        <TipButton
                            onClick={toggleAmbient}
                            aria-pressed={ambientOpen}
                            tip={ambientOpen ? null : t('lighting.ambientTitle')}
                            className={`flex h-8 items-center gap-2 rounded-md px-2 transition-colors ${ambientOpen ? 'bg-white/15 text-white' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}
                        >
                            <Contrast size={16} />
                            <span className="font-rajdhani text-[13px] font-bold uppercase tracking-wider">{t('lighting.ambientShort')}</span>
                            <span className="font-mono text-[11px] text-white">{Math.round(lighting.ambientLevel * 100)}%</span>
                            <span className="h-3 w-3 rounded-full border border-white/30" style={{ background: lighting.ambientColor }} />
                        </TipButton>
                    </div>

                    <ToolbarButton
                        icon={previewAsPlayer ? Eye : EyeOff}
                        label={t('lighting.previewAsPlayer')}
                        active={previewAsPlayer}
                        accent={LIGHT_ACCENT}
                        onClick={() => setPreviewAsPlayer(p => !p)}
                        tooltipAlign="right"
                    />
                </>
            )}

            {ambientOpen && enabled && (
                <AmbientPopover anchorRef={ambientRef} position={ambientPos} lighting={lighting} setLighting={setLighting} onClose={() => setAmbientOpen(false)} />
            )}
        </div>
    );
};

export default LightingToolbar;
