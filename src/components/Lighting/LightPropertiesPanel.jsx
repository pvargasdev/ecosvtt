import React from 'react';
import { Lightbulb, Flashlight, Copy, Trash2, Power, Link2 } from 'lucide-react';
import { useTranslation } from '../../i18n';
import LightSettings from './LightSettings';

// Janela de propriedades da luz selecionada (no mesmo padrão das outras janelas).
// Serve para luzes do mapa e para luzes presas a um token (`attached`): nessas o tipo
// é fixo (cada token tem uma vaga por tipo) e não há duplicar.
const LightPropertiesPanel = ({ light, onChange, onRemove, onDuplicate, attached = false, direction }) => {
    const t = useTranslation();
    const isSpot = light.type === 'spot';

    return (
        <div
            data-ecos-window="true"
            data-ecos-ui="true"
            className="absolute top-[8rem] right-4 w-72 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-50 pointer-events-auto cursor-default animate-in fade-in flex flex-col max-h-[calc(100vh-9.5rem)]"
            onMouseDown={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
        >
            <div className="p-3 border-b border-glass-border bg-white/5 rounded-t-xl flex items-center justify-between shrink-0">
                <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
                    {isSpot ? <Flashlight size={16} className="text-yellow-300" /> : <Lightbulb size={16} className="text-yellow-300" />}
                    {isSpot ? t('lighting.spotLight') : t('lighting.pointLight')}
                </h3>
                <div className="flex gap-1">
                    <button onClick={() => onChange({ enabled: !light.enabled })} className={`p-1 rounded hover:bg-white/10 ${light.enabled ? 'text-yellow-300' : 'text-text-muted'}`} title={light.enabled ? t('lighting.turnOff') : t('lighting.turnOn')}><Power size={14} /></button>
                    {onDuplicate && <button onClick={onDuplicate} className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white" title={t('common.duplicate')}><Copy size={14} /></button>}
                    <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500" title={attached ? t('lighting.token.detach') : t('common.delete')}><Trash2 size={14} /></button>
                </div>
            </div>

            <div className="p-4 space-y-4 bg-black/20 rounded-b-xl overflow-y-auto scrollbar-thin">
                {attached ? (
                    <div className="flex items-center gap-2 rounded-lg border border-yellow-300/20 bg-yellow-300/[0.06] px-3 py-2 text-[11px] text-yellow-100/80">
                        <Link2 size={13} className="shrink-0 text-yellow-300" />
                        {isSpot ? t('lighting.token.spotAttachedHint') : t('lighting.token.pointAttachedHint')}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-lg">
                        {['point', 'spot'].map(type => (
                            <button
                                key={type}
                                onClick={() => onChange({ type })}
                                className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold uppercase transition ${light.type === type ? 'bg-white/15 text-white' : 'text-text-muted hover:text-white'}`}
                            >
                                {type === 'spot' ? <Flashlight size={12} /> : <Lightbulb size={12} />}
                                {type === 'spot' ? t('lighting.spot') : t('lighting.point')}
                            </button>
                        ))}
                    </div>
                )}

                <LightSettings light={light} update={onChange} direction={direction} />
            </div>
        </div>
    );
};

export default LightPropertiesPanel;
