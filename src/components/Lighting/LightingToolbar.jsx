import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Move, Spline, Flashlight, Lightbulb, Eye, EyeOff, Contrast, Plus, X, Check, CircleUserRound } from 'lucide-react';
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
const WALL_ACCENT = '#22d3ee';

const LIGHT_TYPES = [
    { id: 'point', icon: Lightbulb, labelKey: 'lighting.tools.point', descKey: 'lighting.add.pointDesc', shortcut: 'L' },
    { id: 'spot', icon: Flashlight, labelKey: 'lighting.tools.spot', descKey: 'lighting.add.spotDesc', shortcut: 'H' }
];

// Posição de um popover logo abaixo do elemento (em coordenadas da tela).
const popoverPosition = (el, width) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.bottom + 10, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) };
};

// Escolha do tipo de luz a adicionar. Depois de escolher, o cursor entra no modo de
// posicionamento (clique no mapa = luz solta; clique num token = luz presa ao token).
const AddLightPopover = ({ anchorRef, position, onPick, onClose }) => {
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

    return createPortal(
        <div
            ref={panelRef}
            data-ecos-window="true"
            data-ecos-ui="true"
            onMouseDown={e => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left }}
            className="w-72 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 pointer-events-auto cursor-default p-1.5"
        >
            {LIGHT_TYPES.map(({ id, icon, labelKey, descKey, shortcut }) => {
                const Icon = icon;
                return (
                    <button
                        key={id}
                        onClick={() => onPick(id)}
                        className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/10 group"
                    >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-300/10 text-yellow-300 ring-1 ring-yellow-300/20 group-hover:bg-yellow-300/20">
                            <Icon size={16} />
                        </span>
                        <span className="flex-1">
                            <span className="flex items-center justify-between text-sm font-bold text-white">
                                {t(labelKey)}
                                <kbd className="rounded border border-white/15 bg-white/10 px-1 font-mono text-[10px] text-gray-400">{shortcut}</kbd>
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">{t(descKey)}</span>
                        </span>
                    </button>
                );
            })}
        </div>,
        document.body
    );
};

// Luzes do token selecionado: cada tipo é uma vaga. Vaga vazia = adicionar;
// ocupada = abrir as configurações daquela luz.
const TokenLightSlots = ({ token, activeType, onSlot }) => {
    const t = useTranslation();
    return (
        <div className="flex items-center gap-1 rounded-lg bg-black/40 p-1 pl-2">
            <CircleUserRound size={15} className="text-text-muted" />
            <span className="mr-1 font-rajdhani text-[12px] font-bold uppercase tracking-wider text-text-muted">{t('lighting.token.selected')}</span>
            {LIGHT_TYPES.map(({ id, icon, labelKey }) => {
                const Icon = icon;
                const attached = !!token.lights?.[id];
                const active = activeType === id;
                return (
                    <TipButton
                        key={id}
                        onClick={() => onSlot(id)}
                        tip={attached ? t('lighting.token.editLight', { light: t(labelKey) }) : t('lighting.token.addLight', { light: t(labelKey) })}
                        className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold transition ${
                            active ? 'bg-yellow-300/20 text-yellow-200 ring-1 ring-yellow-300/40'
                                : attached ? 'text-yellow-300 hover:bg-white/10'
                                    : 'border border-dashed border-white/15 text-text-muted hover:border-white/30 hover:text-white'
                        }`}
                    >
                        <Icon size={14} />
                        {attached ? <Check size={11} /> : <Plus size={11} />}
                    </TipButton>
                );
            })}
        </div>
    );
};

// Conteúdo da barra contextual do modo de iluminação.
const LightingToolbar = ({
    lighting, setLighting, tool, setTool, previewAsPlayer, setPreviewAsPlayer,
    selectedToken, activeTokenLightType, onTokenLightSlot, selectionKey, onPopoverOpen
}) => {
    const t = useTranslation();
    const [popover, setPopover] = useState(null); // { kind: 'ambient' | 'add', top, left }
    const ambientRef = useRef(null);
    const addRef = useRef(null);
    const enabled = lighting.enabled;
    const placingType = tool === 'point' || tool === 'spot' ? tool : null;
    const placing = LIGHT_TYPES.find(l => l.id === placingType);

    // Popovers e o painel do item selecionado ocupam o mesmo canto da tela, então nunca
    // ficam abertos juntos: abrir um popover limpa a seleção, e selecionar algo fecha
    // o popover (comparação durante a renderização, sem efeito).
    const [seenSelection, setSeenSelection] = useState(selectionKey);
    if (seenSelection !== selectionKey) {
        setSeenSelection(selectionKey);
        if (selectionKey && popover) setPopover(null);
    }

    const togglePopover = (kind, ref, width) => {
        if (popover?.kind === kind) { setPopover(null); return; }
        onPopoverOpen?.();
        setPopover({ kind, ...popoverPosition(ref.current, width) });
    };
    const closePopover = useCallback(() => setPopover(null), []);

    const PlacingIcon = placing?.icon;

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
                        value={placingType ? null : tool}
                        onChange={setTool}
                        items={[
                            { id: 'select', icon: Move, label: t('lighting.tools.select'), shortcut: 'V', accent: LIGHT_ACCENT },
                            { id: 'wall', icon: Spline, label: t('lighting.tools.wall'), shortcut: 'W', accent: WALL_ACCENT }
                        ]}
                    />

                    <div ref={addRef}>
                        {placing ? (
                            // Modo de posicionamento ativo: mostra o tipo e um jeito óbvio de cancelar.
                            <div className="flex h-8 items-center gap-2 rounded-md pl-2.5 pr-1 text-xs font-bold" style={{ color: LIGHT_ACCENT, background: `${LIGHT_ACCENT}24`, boxShadow: `inset 0 0 0 1px ${LIGHT_ACCENT}40` }}>
                                <PlacingIcon size={15} />
                                <span className="whitespace-nowrap font-rajdhani text-[13px] uppercase tracking-wider">{t('lighting.add.placing', { light: t(placing.labelKey) })}</span>
                                <TipButton onClick={() => setTool('select')} tip={t('common.cancel')} shortcut="Esc" className="flex h-6 w-6 items-center justify-center rounded text-yellow-200/70 hover:bg-black/30 hover:text-white">
                                    <X size={13} />
                                </TipButton>
                            </div>
                        ) : (
                            <TipButton
                                onClick={() => togglePopover('add', addRef, 288)}
                                aria-pressed={popover?.kind === 'add'}
                                tip={popover?.kind === 'add' ? null : t('lighting.add.title')}
                                shortcut="L / H"
                                className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors ${popover?.kind === 'add' ? 'bg-white/15 text-white' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}
                            >
                                <Plus size={16} />
                                <span className="font-rajdhani text-[13px] uppercase tracking-wider">{t('lighting.add.button')}</span>
                            </TipButton>
                        )}
                    </div>

                    {selectedToken && (
                        <>
                            <ToolbarDivider />
                            <TokenLightSlots token={selectedToken} activeType={activeTokenLightType} onSlot={onTokenLightSlot} />
                        </>
                    )}

                    <ToolbarDivider />
                    <div ref={ambientRef}>
                        <TipButton
                            onClick={() => togglePopover('ambient', ambientRef, 256)}
                            aria-pressed={popover?.kind === 'ambient'}
                            tip={popover?.kind === 'ambient' ? null : t('lighting.ambientTitle')}
                            className={`flex h-8 items-center gap-2 rounded-md px-2 transition-colors ${popover?.kind === 'ambient' ? 'bg-white/15 text-white' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}
                        >
                            <Contrast size={16} />
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

            {popover?.kind === 'ambient' && enabled && (
                <AmbientPopover anchorRef={ambientRef} position={popover} lighting={lighting} setLighting={setLighting} onClose={closePopover} />
            )}
            {popover?.kind === 'add' && enabled && (
                <AddLightPopover anchorRef={addRef} position={popover} onPick={(type) => { setPopover(null); setTool(type); }} onClose={closePopover} />
            )}
        </div>
    );
};

export default LightingToolbar;
