import React, { memo, useState, useEffect } from 'react';
import { 
    Activity, Heart, CheckSquare, Square, AlignLeft, 
    ToggleLeft, ToggleRight, Minus, Zap, List, AlertCircle,
    Hash, Plus, Package, X, Check, Calculator
} from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL (Estilo Ecos RPG) ---
// ADICIONADO: h-full e flex-col para garantir que o card estique verticalmente
const THEME_CARD = "bg-[#0a0a0c]/80 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden relative group hover:border-white/10 transition-all duration-300 shadow-sm hover:shadow-md h-full flex flex-col justify-between";
const THEME_HEADER = "bg-white/5 px-3 py-2 border-b border-white/5 flex items-center justify-between";
const THEME_LABEL = "text-[9px] uppercase tracking-[0.2em] font-bold text-gray-500 group-hover:text-gray-300 transition-colors select-none";
const THEME_INPUT = "bg-black/40 border border-white/5 rounded text-xs text-white placeholder-white/10 focus:border-[#d084ff] focus:ring-1 focus:ring-[#d084ff]/20 outline-none transition-all";
const NEON_TEXT = "font-rajdhani font-bold text-shadow-sm";

// Helpers
const handleNumber = (value) => {
    if (value === undefined || value === null) return 0;
    const clean = value.toString().replace(/[^0-9-]/g, '').slice(0, 5);
    return clean === '' || clean === '-' ? 0 : parseInt(clean);
};

// ============================================================================
// --- WIDGETS ---
// ============================================================================

// 1. ATRIBUTO (Visual Quadrado & Responsivo)
export const AttributeWidget = memo(({ data, value, onChange, readOnly, isDense }) => {
    const color = data.color || '#d084ff';
    const label = data.label || 'ATR';
    
    return (
        // aspect-square força ser quadrado. p-1 se for denso para economizar espaço.
        <div className={`${THEME_CARD} items-center justify-center w-full aspect-square ${isDense ? 'p-1' : 'py-4'}`}
             style={{ boxShadow: readOnly ? 'none' : `inset 0 0 20px ${color}10` }}>
            
            <span className={`uppercase font-bold tracking-[0.2em] opacity-80 text-center block ${isDense ? 'text-[8px] mb-0' : 'text-[10px] mb-2'}`} 
                  style={{ color: color }}>
                {isDense && label.length > 5 ? label.slice(0,4)+'.' : label}
            </span>

            <div className="relative flex items-center justify-center w-full flex-1">
                 <input 
                    type="text" 
                    readOnly={readOnly}
                    className={`w-full bg-transparent text-center font-rajdhani font-bold text-white outline-none p-0 z-10 
                    ${isDense ? 'text-3xl' : 'text-5xl'} 
                    ${readOnly ? 'cursor-default' : 'cursor-text focus:scale-110 transition-transform'}`}
                    value={value ?? 10}
                    onFocus={(e) => !readOnly && e.target.select()}
                    onChange={(e) => !readOnly && onChange(data.id, handleNumber(e.target.value))}
                />
            </div>
            {/* Efeito Glow Fundo */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>
        </div>
    );
});

// 3. RECURSO (Barra Estilizada)
export const ResourceWidget = memo(({ data, value, onChange, readOnly, isDense }) => {
    const current = value?.current ?? 0;
    const max = value?.max ?? 10;
    const color = data.color || '#ffffff';
    
    // Modo Edição
    if (!readOnly && onChange) {
        return (
            <div className={`${THEME_CARD} justify-center gap-2 ${isDense ? 'p-2' : 'p-3'}`}>
                <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold uppercase tracking-widest ${isDense ? 'text-[7px]' : 'text-[9px]'}`} style={{ color }}>{data.label}</span>
                </div>
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 bg-black/30 rounded border border-white/5 p-1 flex flex-col items-center">
                        <span className="text-[7px] text-gray-500">ATUAL</span>
                        <input className="w-full bg-transparent text-white font-rajdhani font-bold text-lg text-center outline-none"
                            value={current} onChange={e=>onChange(data.id, { current: handleNumber(e.target.value), max })} />
                    </div>
                    <span className="text-gray-600 text-lg">/</span>
                    <div className="flex-1 bg-black/30 rounded border border-white/5 p-1 flex flex-col items-center">
                        <span className="text-[7px] text-gray-500">MÁX</span>
                        <input className="w-full bg-transparent text-white font-rajdhani font-bold text-lg text-center outline-none"
                            value={max} onChange={e=>onChange(data.id, { current, max: handleNumber(e.target.value) })} />
                    </div>
                </div>
            </div>
        );
    }

    // Modo Visualização
    const percent = Math.min(100, Math.max(0, (current / (max || 1)) * 100));
    return (
        <div className="relative h-full min-h-[44px] bg-[#050505] border border-white/10 rounded overflow-hidden flex items-center justify-between group select-none w-full shadow-inner">
            <div className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out opacity-60"
                style={{ width: `${percent}%`, backgroundColor: color, boxShadow: `0 0 15px ${color}60` }} />
            
            <button onClick={() => onChange(data.id, { current: Math.max(0, current - 1), max })} 
                className="z-10 w-8 h-full flex items-center justify-center hover:bg-black/20 text-white/30 hover:text-white transition-colors"><Minus size={14}/></button>
            
            <div className="flex flex-col items-center z-10 leading-none py-1">
                <div className="flex items-baseline gap-1 drop-shadow-md">
                    <span className={`font-bold font-rajdhani text-white ${isDense ? 'text-lg' : 'text-xl'}`}>{current}</span>
                    <span className="text-[10px] font-rajdhani opacity-70 text-white">/ {max}</span>
                </div>
                <span className={`text-[7px] uppercase tracking-[0.2em] font-bold opacity-80 mix-blend-screen ${isDense ? 'hidden' : 'block'}`} style={{ color: percent > 50 ? '#fff' : color }}>{data.label}</span>
            </div>

            <button onClick={() => onChange(data.id, { current: Math.min(max, current + 1), max })} 
                className="z-10 w-8 h-full flex items-center justify-center hover:bg-black/20 text-white/30 hover:text-white transition-colors"><Plus size={14}/></button>
        </div>
    );
});

// 4. LISTA NUMÉRICA
export const NumericListWidget = memo(({ data, value, onChange, readOnly, isDense }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemVal, setNewItemVal] = useState(0);

    const items = value || [];

    const addItem = () => {
        if (!newItemName.trim()) return;
        const newItem = { id: Date.now(), name: newItemName, value: newItemVal };
        onChange(data.id, [...items, newItem]);
        setNewItemName(""); setNewItemVal(0); setIsAdding(false);
    };

    const deleteItem = (itemId) => {
        onChange(data.id, items.filter(i => i.id !== itemId));
    };

    return (
        <div className={THEME_CARD}>
            <div className={THEME_HEADER}>
                <div className="flex items-center gap-2">
                    <Hash size={14} className="text-[#d084ff] opacity-80"/>
                    <span className={THEME_LABEL}>{data.label}</span>
                </div>
            </div>
            
            <div className="flex-1 p-1 space-y-0.5 overflow-y-auto scrollbar-thin min-h-[60px]">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 group border border-transparent hover:border-white/5 transition-colors">
                        <span className={`font-medium text-gray-300 ${isDense ? 'text-[10px]' : 'text-xs'}`}>{item.name}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-rajdhani font-bold text-[#d084ff] bg-[#d084ff]/10 px-2 rounded">
                                {item.value >= 0 ? '+' : ''}{item.value}
                            </span>
                            {!readOnly && (
                                <button onClick={() => deleteItem(item.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={12}/>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {items.length === 0 && !isAdding && <div className="text-center text-[10px] text-gray-600 py-4 italic">Vazio.</div>}
            </div>

            {!readOnly && (
                <div className="p-2 border-t border-white/5 bg-black/20 mt-auto">
                     {isAdding ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2">
                            <input autoFocus className={`${THEME_INPUT} flex-1 px-2 py-1`} 
                                placeholder="Nome..." value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                            <input type="number" className={`${THEME_INPUT} w-14 px-1 py-1 text-center`} 
                                value={newItemVal} onChange={e => setNewItemVal(parseInt(e.target.value)||0)} />
                            <button onClick={addItem} className="p-1 bg-[#d084ff]/20 text-[#d084ff] rounded hover:bg-[#d084ff] hover:text-black"><Check size={14}/></button>
                            <button onClick={() => setIsAdding(false)} className="p-1 text-red-400 hover:bg-red-900/20 rounded"><X size={14}/></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsAdding(true)} className="w-full text-[10px] text-gray-500 hover:text-[#d084ff] flex items-center justify-center gap-1 py-1 transition-colors border border-dashed border-white/10 hover:border-[#d084ff]/50 rounded">
                            <Plus size={10}/> Adicionar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

// 5. INVENTÁRIO
export const InventoryWidget = ({ data, value, onChange, readOnly }) => {
    const [newItemName, setNewItemName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const items = value || [];

    const addItem = () => {
        if (!newItemName.trim()) return;
        onChange(data.id, [...items, { id: Date.now(), name: newItemName }]);
        setNewItemName(""); setIsAdding(false);
    };

    return (
        <div className={THEME_CARD}>
            <div className={THEME_HEADER}>
                <div className="flex items-center gap-2">
                    <Package size={14} className="text-[#d084ff] opacity-80"/>
                    <span className={THEME_LABEL}>{data.label}</span>
                </div>
                <span className="text-[9px] font-rajdhani font-bold text-gray-600">{items.length} ITENS</span>
            </div>
            
            <div className="flex-1 p-2 overflow-y-auto scrollbar-thin space-y-1 min-h-[100px]">
                {items.length === 0 ? <div className="text-center text-[10px] text-gray-600 py-4 italic">Vazio.</div> : 
                    items.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-white/5 hover:bg-white/10 rounded px-2 py-1.5 group border border-transparent hover:border-white/10 transition-all">
                            <span className="text-xs text-gray-300 font-medium">{item.name}</span>
                            {!readOnly && (
                                <button onClick={() => onChange(data.id, items.filter(i => i.id !== item.id))} 
                                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={12}/>
                                </button>
                            )}
                        </div>
                    ))
                }
            </div>

            {!readOnly && (
                <div className="p-2 border-t border-white/5 bg-black/20 mt-auto">
                    {isAdding ? (
                        <div className="flex gap-2 animate-in slide-in-from-bottom-2">
                            <input autoFocus className={`${THEME_INPUT} flex-1 px-2 py-1`} 
                                placeholder="Item..." value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                            <button onClick={addItem} className="text-[#d084ff] hover:bg-white/10 p-1 rounded"><Check size={14}/></button>
                            <button onClick={() => setIsAdding(false)} className="text-red-400 hover:bg-white/10 p-1 rounded"><X size={14}/></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsAdding(true)} className="w-full text-[10px] text-gray-500 hover:text-[#d084ff] flex items-center justify-center gap-1 py-1 transition-colors border border-dashed border-white/10 hover:border-[#d084ff]/50 rounded">
                            <Plus size={10}/> Novo Item
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// 6. HEADER (Texto Curto)
export const HeaderWidget = memo(({ data, value, onChange, readOnly }) => (
    <div className="flex flex-col h-full justify-center">
        <label className={`${THEME_LABEL} mb-1.5 ml-1 block`}>{data.label}</label>
        {readOnly ? (
            <div className="bg-gradient-to-r from-white/5 to-transparent border-l-2 border-[#d084ff] px-3 py-2">
                <span className="text-sm font-bold text-white font-rajdhani tracking-wide uppercase">{value || '-'}</span>
            </div>
        ) : (
            <input className={`${THEME_INPUT} w-full px-3 py-2 text-sm font-rajdhani font-medium border-l-2 border-l-[#d084ff] rounded-l-none`}
                value={value || ''} onChange={(e) => onChange(data.id, e.target.value)} placeholder="..." />
        )}
    </div>
));

// 7. LONG TEXT
export const LongTextWidget = memo(({ data, value, onChange, readOnly, isDense }) => (
    <div className={`${THEME_CARD} ${isDense ? 'p-2' : 'p-4'}`}>
        <label className={`${THEME_LABEL} block border-b border-white/5 pb-1 ${isDense ? 'mb-1 text-[8px]' : 'mb-2'}`}>{data.label}</label>
        {readOnly ? (
            <div className={`text-gray-300 whitespace-pre-wrap leading-relaxed font-mono pl-1 opacity-90 flex-1 ${isDense ? 'text-[10px]' : 'text-xs'}`}>
                {value || <span className="text-gray-700 italic">Sem anotações.</span>}
            </div>
        ) : (
            <textarea className={`${THEME_INPUT} w-full p-3 text-xs leading-relaxed resize-none flex-1 min-h-[80px]`}
                value={value || ''} onChange={e => onChange(data.id, e.target.value)} placeholder="Digite aqui..." />
        )}
    </div>
));

// 8. TOGGLE
export const ToggleWidget = memo(({ data, value, onChange, readOnly }) => (
    <div onClick={() => !readOnly && onChange(data.id, !value)} 
         className={`${THEME_CARD} px-4 py-3 flex items-center justify-between gap-3 ${!readOnly ? 'cursor-pointer hover:bg-white/5' : ''}`}>
        <span className={`${THEME_LABEL} ${value ? 'text-white' : ''}`}>{data.label}</span>
        <div className={`transition-all duration-300 ${value ? 'text-[#d084ff] drop-shadow-[0_0_8px_rgba(208,132,255,0.8)]' : 'text-gray-700'}`}>
            {value ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
        </div>
    </div>
));

// 9. SKILLS (Lista Checkbox)
export const SkillsWidget = memo(({ data, value, onChange, readOnly }) => {
    const toggle = (opt) => {
        if (readOnly) return;
        const current = value || {};
        onChange(data.id, { ...current, [opt]: !current[opt] });
    };

    return (
        <div className={THEME_CARD}>
            <div className={THEME_HEADER}>
                <div className="flex items-center gap-2">
                    <List size={14} className="text-[#d084ff] opacity-80"/>
                    <span className={THEME_LABEL}>{data.label}</span>
                </div>
            </div>
            <div className="flex flex-col divide-y divide-white/5 overflow-y-auto scrollbar-thin min-h-[100px] flex-1">
                {(data.options || []).map(opt => {
                    const isChecked = value?.[opt] || false;
                    return (
                        <div key={opt} onClick={() => toggle(opt)} 
                             className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 
                             ${readOnly ? '' : 'hover:bg-white/5'} ${isChecked ? 'bg-[#d084ff]/5' : ''}`}>
                            
                            <div className={`relative flex items-center justify-center w-3.5 h-3.5 rounded border transition-all 
                                ${isChecked ? 'border-[#d084ff] bg-[#d084ff]' : 'border-gray-700 bg-black/50'}`}>
                                {isChecked && <Check size={10} className="text-black" strokeWidth={4} />}
                            </div>
                            
                            <span className={`text-[10px] font-medium tracking-wide uppercase ${isChecked ? 'text-white font-bold' : 'text-gray-500'}`}>
                                {opt}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

// 10. ABILITIES
export const AbilitiesWidget = memo(({ data, value, onChange, readOnly }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");

    const add = () => {
        if (!newName.trim()) return;
        const item = { id: Date.now(), name: newName, desc: newDesc };
        onChange(data.id, [...(value || []), item]);
        setNewName(""); setNewDesc(""); setIsAdding(false);
    };

    return (
        <div className={THEME_CARD}>
            <div className={THEME_HEADER}>
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-[#d084ff] opacity-80"/>
                    <span className={THEME_LABEL}>{data.label}</span>
                </div>
                {!readOnly && <button onClick={() => setIsAdding(!isAdding)} className="text-gray-500 hover:text-[#d084ff]"><Plus size={14}/></button>}
            </div>
            
            {isAdding && !readOnly && (
                <div className="bg-[#101014] p-3 border-b border-white/10 flex flex-col gap-2 animate-in slide-in-from-top-2">
                    <input autoFocus placeholder="Nome..." className={`${THEME_INPUT} w-full px-2 py-1.5`} value={newName} onChange={e => setNewName(e.target.value)} />
                    <textarea placeholder="Descrição..." className={`${THEME_INPUT} w-full px-2 py-1.5 resize-none h-14`} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                    <button onClick={add} className="bg-[#d084ff]/20 text-[#d084ff] text-[10px] font-bold uppercase py-1.5 rounded hover:bg-[#d084ff] hover:text-black transition-colors w-full">Salvar</button>
                </div>
            )}

            <div className="p-2 space-y-2 overflow-y-auto scrollbar-thin min-h-[100px] flex-1">
                {(value || []).length === 0 && !isAdding && <div className="text-center text-[10px] text-gray-600 italic py-6">Vazio.</div>}
                {(value || []).map(item => (
                    <div key={item.id} className="relative bg-black/20 hover:bg-white/5 border-l-2 border-[#d084ff] rounded-r p-2 group transition-all">
                        <div className="text-xs font-bold text-white group-hover:text-[#d084ff] mb-1">{item.name}</div>
                        <div className="text-[10px] text-gray-400 leading-snug">{item.desc}</div>
                        {!readOnly && (
                            <button onClick={() => onChange(data.id, value.filter(i=>i.id !== item.id))} 
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1">
                                <X size={12}/>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

// 11. SEPARATOR
export const SeparatorWidget = memo(({ data }) => (
    <div className="w-full flex items-center gap-4 my-3 opacity-60 py-2">
        <div className="h-px bg-gradient-to-r from-transparent via-[#d084ff]/40 to-transparent flex-1"></div>
        {data.label && <span className="text-[9px] uppercase font-bold text-[#d084ff] tracking-[0.3em] px-2">{data.label}</span>}
        <div className="h-px bg-gradient-to-r from-transparent via-[#d084ff]/40 to-transparent flex-1"></div>
    </div>
));

// ============================================================================
// --- ENGINE ---
// ============================================================================

export const createInitialState = (blueprint) => {
    const state = {
        name: "Novo Personagem", notes: "",
        headers: {}, attributes: {}, resources: {}, longTexts: {}, toggles: {}, skills: {}, abilities: {}, inventory: {},
        numericLists: {} 
    };

    if (blueprint?.items) {
        Object.values(blueprint.items).forEach(item => {
            const val = item.defaultValue;
            if (item.type === 'skills') state.skills[item.id] = {};
            else if (item.type === 'numericLists') state.numericLists[item.id] = [];
            else if (item.type === 'inventory') state.inventory[item.id] = [];
            else if (item.type === 'abilities') state.abilities[item.id] = [];
            else if (item.type === 'resources') state.resources[item.id] = { current: val || 10, max: val || 10 };
            else if (item.type === 'toggles') state.toggles[item.id] = val || false;
            else if (state[item.type]) state[item.type][item.id] = val;
        });
    } 
    return state;
};

// REGISTRY
export const WIDGET_REGISTRY = {
    headers: { comp: HeaderWidget, label: "Info / Cabeçalho" },
    attributes: { comp: AttributeWidget, label: "Atributo Numérico" },
    resources: { comp: ResourceWidget, label: "Barra de Recurso" },
    numericLists: { comp: NumericListWidget, label: "Lista Numérica" },
    toggles: { comp: ToggleWidget, label: "Interruptor (On/Off)" },
    longTexts: { comp: LongTextWidget, label: "Texto Longo" },
    skills: { comp: SkillsWidget, label: "Lista de Opções" },
    abilities: { comp: AbilitiesWidget, label: "Lista de Habilidades" },
    inventory: { comp: InventoryWidget, label: "Inventário" },
    separators: { comp: SeparatorWidget, label: "Divisor Visual" }
};

// --- RENDERERS ---

const MasterRenderer = ({ systemDef, data, onUpdate, readOnly }) => {
    if (!systemDef) return null;
    const layout = systemDef.layout || [];
    const itemsDef = systemDef.items || {};

    return (
        <div className="space-y-2 w-full">
            {layout.map(row => {
                // Se houver mais de 4 colunas, considera o modo 'denso' para reduzir fontes
                const isDense = (row.columns?.length || 0) > 4;

                return (
                    // items-stretch: Garante que todos filhos tenham a mesma altura
                    <div key={row.id} className="w-full flex gap-2 items-stretch">
                        {row.columns.map((colItems, colIndex) => (
                            // h-auto e flex-col para o container da coluna
                            <div key={`${row.id}-col-${colIndex}`} className="flex-1 flex flex-col gap-2 min-w-0">
                                {colItems.map(itemId => {
                                    const itemDef = itemsDef[itemId];
                                    if (!itemDef || !WIDGET_REGISTRY[itemDef.type]) return null;
                                    const Component = WIDGET_REGISTRY[itemDef.type].comp;
                                    return (
                                        // h-full aqui força o widget a preencher o espaço disponível na coluna
                                        <div key={itemId} className="w-full h-full flex flex-col">
                                            <Component 
                                                data={itemDef} 
                                                value={data[itemDef.type]?.[itemId]} 
                                                onChange={(id, val) => onUpdate(itemDef.type, id, val)} 
                                                readOnly={readOnly}
                                                isDense={isDense}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

export const Editor = ({ data, updateData, systemDef }) => {
    if (!systemDef) return <div className="p-4 text-red-500">Erro: Sistema não encontrado.</div>;
    const handleUpdate = (cat, id, val) => {
        if (cat === 'resources') {
            const currentObj = data[cat]?.[id] || { current: 0, max: 0 };
            updateData({ [cat]: { ...data[cat], [id]: { ...currentObj, ...val } } });
        } else {
            updateData({ [cat]: { ...(data[cat] || {}), [id]: val } });
        }
    };
    return (
        <div className="h-full overflow-y-auto pr-2 scrollbar-thin pb-4">
            <MasterRenderer systemDef={systemDef} data={data} onUpdate={handleUpdate} readOnly={false} />
            <div className={`${THEME_CARD} p-4 mt-6 !h-auto`}>
                <label className={THEME_LABEL + " mb-2 block"}>ANOTAÇÕES GERAIS</label>
                <textarea className={`${THEME_INPUT} w-full p-3 h-32 resize-none`}
                    value={data.notes || ''} onChange={e => updateData({ notes: e.target.value })} 
                    placeholder="História, Inventário, Ideias..."
                />
            </div>
        </div>
    );
};

export const Viewer = ({ data, updateData, systemDef }) => {
    if (!systemDef) return null;
    const handleUpdate = (cat, id, val) => {
        if (cat === 'resources') {
            const currentObj = data[cat]?.[id] || { current: 0, max: 0 };
            updateData({ [cat]: { ...data[cat], [id]: { ...currentObj, current: val.current } } });
        } else {
            updateData({ [cat]: { ...(data[cat] || {}), [id]: val } });
        }
    };
    return (
        <div className="pb-6">
            <div className="flex justify-center -mt-3 mb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold border-b border-white/10 pb-1">{systemDef.name}</span>
            </div>
            <MasterRenderer systemDef={systemDef} data={data} onUpdate={handleUpdate} readOnly={true} />
             {data.notes && (
                <div className={`${THEME_CARD} p-5 mt-6 !h-auto`}>
                    <div className={THEME_LABEL + " mb-3 border-b border-white/5 pb-2"}>ANOTAÇÕES</div>
                    <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-80 overflow-y-auto scrollbar-thin leading-relaxed pl-1">
                        {data.notes}
                    </div>
                </div>
            )}
        </div>
    );
};