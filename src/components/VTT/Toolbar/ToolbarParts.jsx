import React from 'react';

// Peças visuais compartilhadas pela barra superior e pela barra contextual.

export const ToolbarDivider = () => <div className="w-px h-6 bg-glass-border mx-1 shrink-0" />;

// Dica que aparece abaixo do botão (título + atalho), no lugar do title nativo.
export const Tooltip = ({ label, shortcut, align = 'center' }) => {
    if (!label) return null;
    const pos = align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2';
    return (
        <span className={`pointer-events-none absolute top-full mt-2 ${pos} z-[70] flex items-center gap-2 whitespace-nowrap rounded-md border border-glass-border bg-black/95 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 delay-300 group-hover/tip:opacity-100`}>
            {label}
            {shortcut && <kbd className="rounded border border-white/15 bg-white/10 px-1 font-mono text-[10px] text-gray-300">{shortcut}</kbd>}
        </span>
    );
};

// Botão de ícone padrão da barra. `accent` colore o estado ativo.
export const ToolbarButton = ({ icon, label, shortcut, active = false, accent = '#ffffff', onClick, disabled, danger, tooltipAlign, children }) => {
    const Icon = icon;
    return (
    <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={`group/tip relative flex h-9 min-w-9 items-center justify-center gap-2 rounded-md px-2 transition-colors disabled:pointer-events-none disabled:opacity-30 ${
            active ? '' : danger ? 'text-text-muted hover:bg-red-500/15 hover:text-red-400' : 'text-text-muted hover:bg-white/10 hover:text-white'
        }`}
        style={active ? { color: accent, background: `${accent}1f` } : undefined}
    >
        {Icon && <Icon size={18} />}
        {children}
        <Tooltip label={label} shortcut={shortcut} align={tooltipAlign} />
    </button>
    );
};

// Grupo segmentado: o item ativo mostra o rótulo; os outros só o ícone (com dica).
export const SegmentedControl = ({ items, value, onChange, showAllLabels = false }) => (
    <div className="flex items-center gap-0.5 rounded-lg bg-black/40 p-1">
        {items.map(item => {
            const active = item.id === value;
            const Icon = item.icon;
            return (
                <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    disabled={item.disabled}
                    aria-pressed={active}
                    aria-label={item.label}
                    className={`group/tip relative flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-bold transition-all disabled:pointer-events-none disabled:opacity-30 ${active ? 'shadow-sm' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}
                    style={active ? { color: item.accent, background: `${item.accent}24`, boxShadow: `inset 0 0 0 1px ${item.accent}40` } : undefined}
                >
                    <Icon size={16} className="shrink-0" />
                    {(active || showAllLabels) && <span className="whitespace-nowrap font-rajdhani text-[13px] uppercase tracking-wider">{item.label}</span>}
                    {!(active || showAllLabels) && <Tooltip label={item.label} shortcut={item.shortcut} />}
                    {(active || showAllLabels) && item.shortcut && <Tooltip label={item.hint || item.label} shortcut={item.shortcut} />}
                </button>
            );
        })}
    </div>
);

// Interruptor com rótulo (liga/desliga).
export const Switch = ({ checked, onChange, label, accent = '#fde047', title }) => (
    <button
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        title={title}
        className="flex h-8 items-center gap-2 rounded-md px-2 text-xs font-bold text-text-muted transition hover:bg-white/10 hover:text-white"
    >
        <span className="relative h-4 w-7 rounded-full transition-colors" style={{ background: checked ? accent : 'rgba(255,255,255,0.15)' }}>
            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${checked ? 'left-[14px]' : 'left-0.5'}`} />
        </span>
        <span className="font-rajdhani text-[13px] uppercase tracking-wider" style={checked ? { color: accent } : undefined}>{label}</span>
    </button>
);

// Barra contextual (abaixo da principal) com o nome do modo à esquerda.
export const ContextBar = ({ accent, icon, title, children }) => {
    const Icon = icon;
    return (
    <div className="relative flex items-center gap-1 overflow-visible rounded-lg border border-glass-border bg-black/80 p-1.5 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-200">
        <span className="absolute inset-x-3 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        <div className="flex items-center gap-2 pl-1.5 pr-2" style={{ color: accent }}>
            <Icon size={14} />
            <span className="font-rajdhani text-[11px] font-bold uppercase tracking-[0.2em]">{title}</span>
        </div>
        <ToolbarDivider />
        {children}
    </div>
    );
};
