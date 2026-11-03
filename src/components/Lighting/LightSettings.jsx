import React from 'react';
import { Zap } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { LIGHT_COLORS, getFlicker } from '../../lighting/model';

export const Slider = ({ label, value, display, min, max, step = 1, onChange }) => (
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

export const Toggle = ({ label, checked, onChange }) => (
    <button onClick={() => onChange(!checked)} className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-text-muted hover:text-white transition">
        {label}
        <span className={`w-8 h-4 rounded-full relative transition ${checked ? 'bg-yellow-300/80' : 'bg-white/15'}`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
    </button>
);

// Paleta de cores com cor personalizada. `extra` adiciona opções (ex.: preto no piscar).
const ColorPicker = ({ value, onChange, extra = [] }) => {
    const t = useTranslation();
    const colors = [...extra, ...LIGHT_COLORS];
    const current = (value || '').toLowerCase();
    const isPreset = colors.some(c => c.hex === current);
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {colors.map(c => (
                <button
                    key={c.hex}
                    onClick={() => onChange(c.hex)}
                    title={t(`lighting.colors.${c.key}`)}
                    className={`w-6 h-6 rounded-full border border-white/20 transition hover:scale-110 ${current === c.hex ? 'ring-2 ring-white scale-110' : ''}`}
                    style={{ background: c.hex }}
                />
            ))}
            <label className="relative w-6 h-6 rounded-full border border-dashed border-white/40 overflow-hidden cursor-pointer" title={t('lighting.customColor')} style={{ background: isPreset ? 'transparent' : value }}>
                <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/70 pointer-events-none">+</span>
            </label>
        </div>
    );
};

const FLICKER_EXTRA_COLORS = [{ hex: '#000000', key: 'off' }];

const FlickerSettings = ({ light, update }) => {
    const t = useTranslation();
    const flicker = getFlicker(light);
    const setFlicker = (changes) => update({ flicker: { ...flicker, ...changes } });

    return (
        <div className={`rounded-lg border p-3 space-y-3 transition-colors ${flicker.enabled ? 'border-yellow-300/30 bg-yellow-300/[0.04]' : 'border-white/5'}`}>
            <button onClick={() => setFlicker({ enabled: !flicker.enabled })} className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-text-muted hover:text-white transition">
                <span className="flex items-center gap-1.5"><Zap size={12} className={flicker.enabled ? 'text-yellow-300' : ''} />{t('lighting.flicker.title')}</span>
                <span className={`w-8 h-4 rounded-full relative transition ${flicker.enabled ? 'bg-yellow-300/80' : 'bg-white/15'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${flicker.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
            </button>

            {flicker.enabled && (
                <>
                    <div>
                        <div className="text-[10px] font-bold uppercase text-text-muted mb-2">{t('lighting.flicker.color')}</div>
                        <ColorPicker value={flicker.color} onChange={color => setFlicker({ color })} extra={FLICKER_EXTRA_COLORS} />
                    </div>
                    <Slider label={t('lighting.flicker.interval')} value={Math.round(flicker.interval * 100)} display={`${flicker.interval.toFixed(2)}s`} min={5} max={500} step={5} onChange={v => setFlicker({ interval: v / 100 })} />
                    <Slider label={t('lighting.flicker.duration')} value={Math.round(flicker.duration * 100)} display={`${flicker.duration.toFixed(2)}s`} min={5} max={300} step={5} onChange={v => setFlicker({ duration: v / 100 })} />
                    <Toggle label={t('lighting.flicker.irregular')} checked={flicker.irregular} onChange={v => setFlicker({ irregular: v })} />
                </>
            )}
        </div>
    );
};

// Configurações de uma luz (usadas no painel da luz do mapa e no menu de luz do token).
// `direction` permite trocar o controle de direção (no token ela é relativa ao token).
const LightSettings = ({ light, update, direction }) => {
    const t = useTranslation();
    const isSpot = light.type === 'spot';
    const dir = direction || {
        value: ((light.direction % 360) + 360) % 360,
        onChange: v => update({ direction: v })
    };

    return (
        <div className="space-y-4">
            <div>
                <div className="text-[10px] font-bold uppercase text-text-muted mb-2">{t('lighting.color')}</div>
                <ColorPicker value={light.color} onChange={color => update({ color })} />
            </div>

            <Slider label={t('lighting.intensity')} value={Math.round(light.intensity * 100)} display={`${Math.round(light.intensity * 100)}%`} min={5} max={100} onChange={v => update({ intensity: v / 100 })} />
            <Slider label={t('lighting.radius')} value={light.radius} display={`${light.radius}px`} min={40} max={4000} step={10} onChange={v => update({ radius: v })} />
            <Slider label={t('lighting.softness')} value={Math.round(light.softness * 100)} display={`${Math.round(light.softness * 100)}%`} min={0} max={100} onChange={v => update({ softness: v / 100 })} />

            {isSpot && (
                <>
                    <Slider label={t('lighting.angle')} value={light.angle} display={`${light.angle}°`} min={10} max={180} onChange={v => update({ angle: v })} />
                    <Slider label={t('lighting.direction')} value={dir.value} display={`${dir.value}°`} min={0} max={359} onChange={dir.onChange} />
                </>
            )}

            <Toggle label={t('lighting.castShadows')} checked={light.castShadows} onChange={v => update({ castShadows: v })} />
            <FlickerSettings light={light} update={update} />
        </div>
    );
};

export default LightSettings;
