import React from 'react';
import { useHoverTip } from './useHoverTip';

// Peças visuais compartilhadas pela barra superior e pela barra contextual.

export const ToolbarDivider = () => <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />;

// Dica que aparece abaixo do botão (título + atalho), no lugar do title nativo.
// A visibilidade vem de useHoverTip (some ao clicar).
export const Tooltip = ({ label, shortcut, align = 'center', visible }) => {
    if (!label) return null;
    const pos = align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2';
    return (
        <span className={`pointer-events-none absolute top-full mt-2.5 ${pos} z-[70] flex items-center gap-2 whitespace-nowrap rounded-md border border-glass-border bg-black/95 px-2 py-1 text-[11px] font-medium normal-case tracking-normal text-white shadow-lg transition-all duration-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
            {label}
            {shortcut && <kbd className="rounded border border-white/15 bg-white/10 px-1 font-mono text-[10px] text-gray-300">{shortcut}</kbd>}
        </span>
    );
};

// Botão com dica, para casos que não se encaixam no ToolbarButton.
export const TipButton = ({ tip, shortcut, tipAlign, className, style, children, ...props }) => {
    const { visible, handlers } = useHoverTip();
    return (
        <button
            {...props}
            {...handlers}
            className={`relative outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${className || ''}`}
            style={style}
        >
            {children}
            <Tooltip label={tip} shortcut={shortcut} align={tipAlign} visible={visible} />
        </button>
    );
};

// Botão de ícone padrão da barra. `accent` colore o estado ativo.
export const ToolbarButton = ({ icon, label, shortcut, active = false, accent = '#ffffff', onClick, disabled, danger, tooltipAlign, children }) => {
    const Icon = icon;
    return (
        <TipButton
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            tip={label}
            shortcut={shortcut}
            tipAlign={tooltipAlign}
            className={`flex h-9 min-w-9 items-center justify-center gap-2 rounded-lg px-2 transition-colors disabled:pointer-events-none disabled:opacity-30 ${
                active ? '' : danger ? 'text-text-muted hover:bg-red-500/15 hover:text-red-400' : 'text-text-muted hover:bg-white/10 hover:text-white'
            }`}
            style={active ? { color: accent, background: `${accent}1f`, boxShadow: `inset 0 0 0 1px ${accent}33` } : undefined}
        >
            {Icon && <Icon size={18} />}
            {children}
        </TipButton>
    );
};

const SegmentItem = ({ item, active, showLabel, onChange }) => {
    const Icon = item.icon;
    return (
        <TipButton
            onClick={() => onChange(item.id)}
            disabled={item.disabled}
            aria-pressed={active}
            aria-label={item.label}
            tip={showLabel ? (item.shortcut ? item.hint || item.label : null) : item.label}
            shortcut={item.shortcut}
            className={`flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-bold transition-all disabled:pointer-events-none disabled:opacity-30 ${active ? 'shadow-sm' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}
            style={active ? { color: item.accent, background: `${item.accent}24`, boxShadow: `inset 0 0 0 1px ${item.accent}40` } : undefined}
        >
            <Icon size={16} className="shrink-0" />
            {showLabel && <span className="whitespace-nowrap font-rajdhani text-[13px] uppercase tracking-wider">{item.label}</span>}
        </TipButton>
    );
};

// Grupo segmentado: o item ativo mostra o rótulo; os outros só o ícone (com dica).
export const SegmentedControl = ({ items, value, onChange, showAllLabels = false }) => (
    <div className="flex items-center gap-0.5 rounded-lg bg-black/40 p-1">
        {items.map(item => {
            const active = item.id === value;
            return <SegmentItem key={item.id} item={item} active={active} showLabel={active || showAllLabels} onChange={onChange} />;
        })}
    </div>
);

// Interruptor com rótulo (liga/desliga).
export const Switch = ({ checked, onChange, label, accent = '#fde047', title }) => (
    <TipButton
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        tip={title}
        tipAlign="left"
        className="flex h-8 items-center gap-2 rounded-md px-2 text-xs font-bold text-text-muted transition hover:bg-white/10 hover:text-white"
    >
        <span className="relative h-4 w-7 rounded-full transition-colors" style={{ background: checked ? accent : 'rgba(255,255,255,0.15)' }}>
            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${checked ? 'left-[14px]' : 'left-0.5'}`} />
        </span>
        <span className="font-rajdhani text-[13px] uppercase tracking-wider" style={checked ? { color: accent } : undefined}>{label}</span>
    </TipButton>
);

// Barra contextual (abaixo da principal) com as ferramentas do modo atual. Não repete
// o nome do modo (ele já está destacado na barra principal); a borda na cor do modo
// liga visualmente as duas.
export const ContextBar = ({ accent, children }) => (
    <div
        className="relative flex items-center gap-1 rounded-xl border bg-black/85 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200"
        style={{ borderColor: `${accent}40` }}
    >
        {children}
    </div>
);
