import React from 'react';
import { Lightbulb, Flashlight, Copy, Trash2, Power } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { LIGHT_COLORS } from '../../lighting/model';
import { newId } from '../../lighting/geometry';

const Slider = ({ label, value, display, min, max, step = 1, onChange }) => (
    <div>
        <div className="flex justify-between text-[10px] font-bold uppercase text-text-muted mb-1.5">
            <span>{label}</span><span className="text-white font-mono">{display}</span>
        </div>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
    </div>
);

const Toggle = ({ label, checked, onChange }) => (
    <button onClick={() => onChange(!checked)} className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-text-muted hover:text-white transition">
        {label}
        <span className={`w-8 h-4 rounded-full relative transition ${checked ? 'bg-yellow-300/80' : 'bg-white/15'}`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
    </button>
);

// Janela de propriedades da luz selecionada (no mesmo padrão das outras janelas).
const LightPropertiesPanel = ({ light, setLighting, onSelect, onClose }) => {
    const t = useTranslation();
    const update = (changes) => setLighting(l => ({ ...l, lights: l.lights.map(x => (x.id === light.id ? { ...x, ...changes } : x)) }));

    const duplicate = () => {
        const copy = { ...light, id: newId(), x: light.x + 60, y: light.y + 60 };
        setLighting(l => ({ ...l, lights: [...l.lights, copy] }));
        onSelect({ kind: 'light', id: copy.id });
    };

    const remove = () => {
        setLighting(l => ({ ...l, lights: l.lights.filter(x => x.id !== light.id) }));
        onClose();
    };

    const isSpot = light.type === 'spot';

    return (
        <div
            data-ecos-window="true"
            data-ecos-ui="true"
            className="absolute top-16 right-4 w-72 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-50 pointer-events-auto cursor-default animate-in fade-in flex flex-col max-h-[calc(100vh-6rem)]"
            onMouseDown={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
        >
            <div className="p-3 border-b border-glass-border bg-white/5 rounded-t-xl flex items-center justify-between shrink-0">
                <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
                    {isSpot ? <Flashlight size={16} className="text-yellow-300" /> : <Lightbulb size={16} className="text-yellow-300" />}
                    {isSpot ? t('lighting.spotLight') : t('lighting.pointLight')}
                </h3>
                <div className="flex gap-1">
                    <button onClick={() => update({ enabled: !light.enabled })} className={`p-1 rounded hover:bg-white/10 ${light.enabled ? 'text-yellow-300' : 'text-text-muted'}`} title={light.enabled ? t('lighting.turnOff') : t('lighting.turnOn')}><Power size={14} /></button>
                    <button onClick={duplicate} className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white" title={t('common.duplicate')}><Copy size={14} /></button>
                    <button onClick={remove} className="p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500" title={t('common.delete')}><Trash2 size={14} /></button>
                </div>
            </div>

            <div className="p-4 space-y-4 bg-black/20 rounded-b-xl overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-lg">
                    {['point', 'spot'].map(type => (
                        <button
                            key={type}
                            onClick={() => update({ type })}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold uppercase transition ${light.type === type ? 'bg-white/15 text-white' : 'text-text-muted hover:text-white'}`}
                        >
                            {type === 'spot' ? <Flashlight size={12} /> : <Lightbulb size={12} />}
                            {type === 'spot' ? t('lighting.spot') : t('lighting.point')}
                        </button>
                    ))}
                </div>

                <div>
                    <div className="text-[10px] font-bold uppercase text-text-muted mb-2">{t('lighting.color')}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {LIGHT_COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => update({ color: c.hex })}
                                title={t(`lighting.colors.${c.key}`)}
                                className={`w-6 h-6 rounded-full border border-white/20 transition hover:scale-110 ${light.color.toLowerCase() === c.hex ? 'ring-2 ring-white scale-110' : ''}`}
                                style={{ background: c.hex }}
                            />
                        ))}
                        <label className="relative w-6 h-6 rounded-full border border-dashed border-white/40 overflow-hidden cursor-pointer" title={t('lighting.customColor')} style={{ background: LIGHT_COLORS.some(c => c.hex === light.color.toLowerCase()) ? 'transparent' : light.color }}>
                            <input type="color" value={light.color} onChange={e => update({ color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/70 pointer-events-none">+</span>
                        </label>
                    </div>
                </div>

                <Slider label={t('lighting.intensity')} value={Math.round(light.intensity * 100)} display={`${Math.round(light.intensity * 100)}%`} min={5} max={100} onChange={v => update({ intensity: v / 100 })} />
                <Slider label={t('lighting.radius')} value={light.radius} display={`${light.radius}px`} min={40} max={4000} step={10} onChange={v => update({ radius: v })} />
                <Slider label={t('lighting.softness')} value={Math.round(light.softness * 100)} display={`${Math.round(light.softness * 100)}%`} min={0} max={100} onChange={v => update({ softness: v / 100 })} />

                {isSpot && (
                    <>
                        <Slider label={t('lighting.angle')} value={light.angle} display={`${light.angle}°`} min={10} max={180} onChange={v => update({ angle: v })} />
                        <Slider label={t('lighting.direction')} value={((light.direction % 360) + 360) % 360} display={`${((light.direction % 360) + 360) % 360}°`} min={0} max={359} onChange={v => update({ direction: v })} />
                    </>
                )}

                <Toggle label={t('lighting.castShadows')} checked={light.castShadows} onChange={v => update({ castShadows: v })} />
            </div>
        </div>
    );
};

export default LightPropertiesPanel;
