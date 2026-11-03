import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Lightbulb, Flashlight, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { createTokenLight, DEFAULT_TOKEN_LIGHT_DIRECTION } from '../../lighting/model';
import LightSettings from './LightSettings';

const MENU_WIDTH = 288;
const MARGIN = 12;

const TYPES = [
    { id: 'point', icon: Lightbulb, labelKey: 'lighting.point' },
    { id: 'spot', icon: Flashlight, labelKey: 'lighting.spot' }
];

// Menu de contexto do token (botão direito, com a iluminação da cena ativa): monta
// até duas luzes no token, uma de cada tipo, com as configurações ali mesmo.
const TokenLightMenu = ({ token, x, y, onUpdateToken, onClose }) => {
    const t = useTranslation();
    const ref = useRef(null);
    const lights = token.lights || {};
    const [tab, setTab] = useState(() => (lights.point || !lights.spot ? 'point' : 'spot'));

    useEffect(() => {
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
    }, [onClose]);

    // Mantém o menu inteiro dentro da tela.
    useLayoutEffect(() => {
        const node = ref.current;
        const parent = node?.offsetParent;
        if (!node || !parent) return;
        const left = Math.max(MARGIN, Math.min(x, parent.clientWidth - node.offsetWidth - MARGIN));
        const top = Math.max(MARGIN, Math.min(y, parent.clientHeight - node.offsetHeight - MARGIN));
        node.style.left = `${left}px`;
        node.style.top = `${top}px`;
    }, [x, y, tab, lights.point, lights.spot]);

    const setLight = (type, light) => onUpdateToken({ lights: { ...lights, [type]: light } });
    const updateLight = (type, changes) => setLight(type, { ...lights[type], ...changes });
    const attach = (type, on) => {
        const updates = { lights: { ...lights, [type]: on ? createTokenLight(type) : null } };
        if (on && type === 'spot' && token.lightDirection === undefined) updates.lightDirection = DEFAULT_TOKEN_LIGHT_DIRECTION;
        onUpdateToken(updates);
    };

    const current = lights[tab];
    const relDirection = ((Math.round(token.lightDirection ?? DEFAULT_TOKEN_LIGHT_DIRECTION) % 360) + 360) % 360;

    return (
        <div
            ref={ref}
            data-ecos-window="true"
            data-ecos-ui="true"
            className="absolute z-[200] bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl pointer-events-auto cursor-default animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[calc(100vh-2rem)]"
            style={{ left: x, top: y, width: MENU_WIDTH }}
            onMouseDown={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
            onContextMenu={e => e.preventDefault()}
        >
            <div className="p-3 border-b border-glass-border bg-white/5 rounded-t-xl flex items-center gap-2 shrink-0">
                <Lightbulb size={16} className="text-yellow-300" />
                <h3 className="font-rajdhani font-bold text-white">{t('lighting.token.title')}</h3>
                <button onClick={onClose} className="ml-auto p-1 rounded text-text-muted hover:text-white hover:bg-white/10"><X size={14} /></button>
            </div>

            <div className="p-2 shrink-0">
                <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-lg">
                    {TYPES.map(({ id, icon, labelKey }) => {
                        const Icon = icon;
                        const attached = !!lights[id];
                        return (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold uppercase transition ${tab === id ? 'bg-white/15 text-white' : 'text-text-muted hover:text-white'}`}
                            >
                                <Icon size={12} />
                                {t(labelKey)}
                                <span className={`w-1.5 h-1.5 rounded-full ${attached ? 'bg-yellow-300 shadow-[0_0_6px_#fde047]' : 'bg-white/15'}`} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-4 pb-4 pt-1 space-y-4 overflow-y-auto scrollbar-thin">
                <button
                    onClick={() => attach(tab, !current)}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold transition ${current ? 'border-yellow-300/40 bg-yellow-300/10 text-yellow-200' : 'border-white/10 text-text-muted hover:text-white hover:border-white/20'}`}
                >
                    {current ? t('lighting.token.attached') : t('lighting.token.attach')}
                    <span className={`w-8 h-4 rounded-full relative transition ${current ? 'bg-yellow-300/80' : 'bg-white/15'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${current ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                </button>

                {current ? (
                    <LightSettings
                        light={{ ...current, type: tab }}
                        update={changes => updateLight(tab, changes)}
                        direction={{ value: relDirection, onChange: v => onUpdateToken({ lightDirection: v }) }}
                    />
                ) : (
                    <p className="text-[11px] leading-relaxed text-text-muted">{tab === 'spot' ? t('lighting.token.spotHint') : t('lighting.token.pointHint')}</p>
                )}
            </div>
        </div>
    );
};

export default TokenLightMenu;
