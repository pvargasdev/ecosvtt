import React, { memo, useState } from 'react';
import { 
    Activity, Heart, CheckSquare, Square, AlignLeft, 
    ToggleLeft, ToggleRight, Minus, Zap, List, AlertCircle,
    Hash, Plus, Package, X, Check
} from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL ---
const THEME_BG_INPUT = "bg-black/30 border border-white/10 text-white focus:border-[#d084ff] transition-all outline-none font-medium placeholder-white/10 focus:shadow-[0_0_10px_rgba(208,132,255,0.2)]";
const THEME_CARD = "bg-black/40 backdrop-blur-md border border-white/10 shadow-xl rounded-xl relative overflow-hidden group hover:border-white/20 transition-all duration-300";
const THEME_LABEL = "text-[9px] uppercase tracking-[0.2em] font-bold text-gray-400 group-hover:text-gray-200 transition-colors select-none";

// Helpers Seguros
const handleNumber = (value) => {
    if (value === undefined || value === null) return 0;
    const clean = value.toString().replace(/[^0-9-]/g, '').slice(0, 5);
    return clean === '' || clean === '-' ? 0 : parseInt(clean);
};

const getContrastColor = (hexColor) => {
    if (!hexColor) return '#ffffff';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128 ? '#000000' : '#ffffff';
};

// ============================================================================
// --- WIDGETS ---
// ============================================================================

// 1. ATRIBUTO (Visual Ecos RPG - Dinâmico)
export const AttributeWidget = memo(({ data, value, onChange, readOnly }) => {
    const color = data.color || '#d084ff';
    return (
        <div className={`${THEME_CARD} flex flex-col items-center justify-center py-3 relative overflow-hidden transition-all duration-500 h-full min-h-[90px]`}
             style={{ borderColor: readOnly ? 'rgba(255,255,255,0.1)' : `${color}40` }}>
            
            <span className="text-[9px] uppercase font-bold tracking-[0.2em] z-10 mb-1 transition-colors" 
                  style={{ color: color, textShadow: `0 0 10px ${color}40` }}>
                {data.label ? data.label.slice(0, 3) : 'ATR'}
            </span>

            <input 
                type="text" 
                readOnly={readOnly}
                className={`w-full bg-transparent text-center font-rajdhani font-bold text-4xl text-white outline-none p-0 z-10 ${readOnly ? 'cursor-default' : 'cursor-text'}`}
                value={value ?? 10}
                onFocus={(e) => !readOnly && e.target.select()}
                onChange={(e) => !readOnly && onChange(data.id, handleNumber(e.target.value))}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                 style={{ backgroundImage: `linear-gradient(to top, ${color}40, transparent)` }} />
        </div>
    );
});

// 2. CONTADOR (Apenas Número)
export const CounterWidget = memo(({ data, value, onChange, readOnly }) => (
    <div className={`${THEME_CARD} p-2 flex flex-col items-center justify-center h-full min-h-[80px] hover:bg-white/5 transition-colors`}>
        <input 
            className="w-full bg-transparent text-center text-white text-3xl font-rajdhani font-bold outline-none border-b border-transparent focus:border-[#d084ff] transition-all py-1" 
            value={value ?? 0} 
            readOnly={readOnly}
            onFocus={(e) => !readOnly && e.target.select()}
            onChange={e => !readOnly && onChange(data.id, handleNumber(e.target.value))} 
        />
        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mt-1">{data.label}</span>
    </div>
));

// 3. RECURSO (Barra)
export const ResourceWidget = memo(({ data, value, onChange, readOnly }) => {
    const current = value?.current ?? 0;
    const max = value?.max ?? 10;
    const color = data.color || '#ffffff';
    const textColor = getContrastColor(color);
    
    if (!readOnly && onChange) {
        return (
            <div className={`${THEME_CARD} p-3 flex flex-col justify-between h-full`}>
                <label className="text-[10px] uppercase font-bold tracking-widest" style={{ color }}>{data.label}</label>
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-black/20 rounded p-1">
                        <span className="text-[7px] text-gray-500 block text-center">ATUAL</span>
                        <input type="text" className="w-full bg-transparent text-white font-rajdhani font-bold text-xl text-center outline-none"
                            value={current} onFocus={e=>e.target.select()} onChange={e=>onChange(data.id, { current: handleNumber(e.target.value), max })} />
                    </div>
                    <div className="flex-1 bg-black/20 rounded p-1">
                        <span className="text-[7px] text-gray-500 block text-center">MÁX</span>
                        <input type="text" className="w-full bg-transparent text-white font-rajdhani font-bold text-xl text-center outline-none"
                            value={max} onFocus={e=>e.target.select()} onChange={e=>onChange(data.id, { current, max: handleNumber(e.target.value) })} />
                    </div>
                </div>
            </div>
        );
    }

    const percent = Math.min(100, Math.max(0, (current / (max || 1)) * 100));

    return (
        <div className="relative h-12 bg-black/60 border border-white/10 rounded-lg overflow-hidden flex items-center justify-between group shadow-inner select-none w-full">
            <div className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out opacity-70"
                style={{ width: `${percent}%`, backgroundColor: color, boxShadow: `0 0 20px ${color}80` }} />
            
            <button onClick={() => onChange(data.id, { current: Math.max(0, current - 1), max })} 
                className="z-10 w-10 h-full flex items-center justify-center hover:bg-black/30 transition-colors text-white/50 hover:text-white"><Minus size={16} strokeWidth={3} /></button>
            
            <div className="flex flex-col items-center z-10 leading-none drop-shadow-md">
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-rajdhani text-white tracking-tight">{current}</span>
                    <span className="text-xs font-rajdhani opacity-70 text-white font-medium">/ {max}</span>
                </div>
                <span className="text-[8px] uppercase tracking-[0.25em] font-bold opacity-90" style={{ color: percent > 50 ? textColor : color }}>{data.label}</span>
            </div>

            <button onClick={() => onChange(data.id, { current: Math.min(max, current + 1), max })} 
                className="z-10 w-10 h-full flex items-center justify-center hover:bg-black/30 transition-colors text-white/50 hover:text-white"><Plus size={16} strokeWidth={3} /></button>
        </div>
    );
});

// 4. INVENTÁRIO (Lista Simples de Texto)
export const InventoryWidget = ({ data, value, onChange, readOnly }) => {
    const [newItemName, setNewItemName] = useState("");
    const [newItemDesc, setNewItemDesc] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const items = value || [];

    const addItem = () => {
        if (!newItemName.trim()) return;
        const newItem = { id: Date.now(), name: newItemName, desc: newItemDesc };
        onChange(data.id, [...items, newItem]);
        setNewItemName(""); setNewItemDesc(""); setIsAdding(false);
    };

    const deleteItem = (id) => {
        if (readOnly) return;
        onChange(data.id, items.filter(i => i.id !== id));
    };

    return (
        <div className={`${THEME_CARD} flex flex-col min-h-[150px]`}>
            <div className="px-3 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package size={14} className="text-[#d084ff] opacity-80"/>
                    <span className={THEME_LABEL}>{data.label}</span>
                </div>
                <div className="text-[9px] font-rajdhani font-bold text-gray-500">{items.length} ITENS</div>
            </div>
            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin max-h-40">
                {items.length === 0 ? <div className="text-center text-[10px] text-gray-600 py-4 italic">Vazio.</div> : (
                    <div className="space-y-1">
                        {items.map(item => (
                            <div key={item.id} className="flex flex-col bg-black/20 hover:bg-white/5 rounded px-2 py-1.5 group border border-transparent hover:border-white/5 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="text-xs text-gray-200 font-bold">{item.name}</div>
                                    {!readOnly && (
                                        <button onClick={() => deleteItem(item.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={10}/>
                                        </button>
                                    )}
                                </div>
                                {item.desc && <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{item.desc}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {!readOnly && (
                <div className="p-2 border-t border-white/5 bg-black/20">
                    {isAdding ? (
                        <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2">
                            <input autoFocus className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-[#d084ff]" 
                                placeholder="Nome do Item..." value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                            <input className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-[#d084ff]" 
                                placeholder="Descrição (Opcional)..." value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
                            <div className="flex gap-2">
                                <button onClick={addItem} className="flex-1 bg-[#d084ff]/20 text-[#d084ff] text-[9px] font-bold uppercase py-1 rounded hover:bg-[#d084ff] hover:text-black transition-colors">Adicionar</button>
                                <button onClick={() => setIsAdding(false)} className="px-3 bg-red-500/10 text-red-400 text-[9px] font-bold uppercase py-1 rounded hover:bg-red-500 hover:text-white transition-colors">X</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsAdding(true)} className="w-full text-[10px] text-gray-500 hover:text-[#d084ff] flex items-center justify-center gap-1 transition-colors py-1">
                            <Plus size={10}/> Novo Item
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// 5. HEADER (Texto Curto)
export const HeaderWidget = memo(({ data, value, onChange, readOnly }) => (
    <div className={`flex flex-col ${readOnly ? 'items-center' : ''} h-full justify-center`}>
        <label className={`${THEME_LABEL} mb-1 ${readOnly ? 'text-center' : ''}`}>{data.label}</label>
        {readOnly ? (
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 min-w-[120px] text-center">
                <span className="text-sm font-bold text-white font-rajdhani tracking-wide">{value || '-'}</span>
            </div>
        ) : (
            <input className={`${THEME_BG_INPUT} w-full rounded-lg px-3 py-2 text-sm font-rajdhani font-medium`}
                value={value || ''} onChange={(e) => onChange(data.id, e.target.value)} placeholder="..." />
        )}
    </div>
));

// 6. LONG TEXT
export const LongTextWidget = memo(({ data, value, onChange, readOnly }) => (
    <div className={`col-span-full ${THEME_CARD} p-4 h-full`}>
        <label className={`${THEME_LABEL} mb-2 block`}>{data.label}</label>
        {readOnly ? (
            <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-light pl-1">{value || '-'}</div>
        ) : (
            <textarea className={`${THEME_BG_INPUT} w-full rounded-xl p-3 text-xs leading-relaxed resize-none scrollbar-thin scrollbar-thumb-[#d084ff]/30 h-24`}
                value={value || ''} onChange={e => onChange(data.id, e.target.value)} placeholder="..." />
        )}
    </div>
));

// 7. TOGGLE
export const ToggleWidget = memo(({ data, value, onChange, readOnly }) => (
    <div onClick={() => !readOnly && onChange(data.id, !value)} 
         className={`${THEME_CARD} p-3 flex items-center gap-3 ${!readOnly ? 'cursor-pointer' : ''} ${value ? 'border-[#d084ff]/40 bg-[#d084ff]/5' : ''} h-full`}>
        <div className={`transition-all duration-300 ${value ? 'text-[#d084ff] drop-shadow-[0_0_8px_rgba(208,132,255,0.5)]' : 'text-gray-600'}`}>
            {value ? <ToggleRight size={28} strokeWidth={1.5} /> : <ToggleLeft size={28} strokeWidth={1.5} />}
        </div>
        <span className={`${THEME_LABEL} ${value ? 'text-white' : ''}`}>{data.label}</span>
    </div>
));

// 8. SEPARATOR
export const SeparatorWidget = memo(({ data }) => (
    <div className="w-full flex items-center gap-4 my-2 opacity-70">
        <div className="h-px bg-gradient-to-r from-transparent via-[#d084ff]/50 to-transparent flex-1"></div>
        {data.label && <span className="text-[10px] uppercase font-bold text-[#d084ff] tracking-[0.3em] px-2 text-shadow-sm">{data.label}</span>}
        <div className="h-px bg-gradient-to-r from-transparent via-[#d084ff]/50 to-transparent flex-1"></div>
    </div>
));

// 9. SKILLS
export const SkillsWidget = memo(({ data, value, onChange, readOnly }) => {
    const toggle = (opt) => {
        if (readOnly) return;
        const current = value || {};
        onChange(data.id, { ...current, [opt]: !current[opt] });
    };

    return (
        <div className={`${THEME_CARD} flex flex-col h-full`}>
            <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center gap-2">
                <List size={14} className="text-[#d084ff] opacity-80"/>
                <span className={THEME_LABEL}>{data.label}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/5 border-t border-white/5 p-px">
                {(data.options || []).map(opt => {
                    const isChecked = value?.[opt] || false;
                    return (
                        <div key={opt} onClick={() => toggle(opt)} 
                             className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all duration-200 bg-[#0a0a0c] ${readOnly ? '' : 'hover:bg-white/5'} ${isChecked ? 'text-white' : 'text-gray-500'}`}>
                            <div className={`relative flex items-center justify-center w-3.5 h-3.5 rounded border transition-all ${isChecked ? 'border-[#d084ff] bg-[#d084ff]/20' : 'border-gray-700'}`}>
                                {isChecked && <div className="w-2 h-2 bg-[#d084ff] rounded-[1px] shadow-[0_0_8px_#d084ff]"></div>}
                            </div>
                            <span className={`text-[10px] font-medium tracking-wide truncate ${isChecked ? 'opacity-100' : 'opacity-50'}`}>{opt}</span>
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

    const remove = (itemId) => {
        onChange(data.id, (value || []).filter(i => i.id !== itemId));
    };

    return (
        <div className={`${THEME_CARD} flex flex-col h-full`}>
            <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-[#d084ff] opacity-80"/>
                    <span className={THEME_LABEL}>{data.label}</span>
                </div>
                {!readOnly && <button onClick={() => setIsAdding(!isAdding)} className="text-gray-500 hover:text-[#d084ff] transition-colors bg-white/5 rounded-full p-1.5 hover:bg-white/10"><Plus size={14}/></button>}
            </div>
            
            {isAdding && !readOnly && (
                <div className="bg-[#15151a] p-3 border-b border-white/10 flex flex-col gap-3 animate-in slide-in-from-top-2">
                    <input autoFocus placeholder="Nome..." className={THEME_BG_INPUT + " rounded-lg px-3 py-2 text-xs"} value={newName} onChange={e => setNewName(e.target.value)} />
                    <textarea placeholder="Descrição..." className={THEME_BG_INPUT + " rounded-lg px-3 py-2 text-xs h-16 resize-none"} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAdding(false)} className="text-[10px] font-bold text-gray-500 hover:text-white px-3 py-1.5 uppercase">Cancelar</button>
                        <button onClick={add} className="text-[10px] font-bold bg-[#d084ff] text-black px-4 py-1.5 rounded-md hover:bg-white shadow-[0_0_15px_rgba(208,132,255,0.4)] uppercase">Salvar</button>
                    </div>
                </div>
            )}

            <div className="p-3 space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                {(value || []).length === 0 && !isAdding && <div className="text-center text-[10px] text-gray-600 italic py-6">Vazio.</div>}
                {(value || []).map(item => (
                    <div key={item.id} className="group relative bg-black/20 hover:bg-white/5 border border-white/5 hover:border-[#d084ff]/30 rounded-lg p-3 transition-all duration-300">
                        <div className="text-xs font-bold text-gray-200 group-hover:text-[#d084ff] mb-1">{item.name}</div>
                        <div className="text-[10px] text-gray-500 group-hover:text-gray-300 leading-relaxed">{item.desc}</div>
                        {!readOnly && (
                            <button onClick={() => remove(item.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1.5 hover:bg-white/5 rounded-full"><X size={12}/></button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

// ============================================================================
// --- ENGINE ---
// ============================================================================

export const createInitialState = (blueprint) => {
    const state = {
        name: "Novo Personagem",
        notes: "",
        headers: {}, attributes: {}, resources: {}, counters: {},
        longTexts: {}, toggles: {}, skills: {}, abilities: {}, inventory: {}
    };

    if (!blueprint) return state;

    // SUPORTE AO NOVO FORMATO (Items Dictionary)
    if (blueprint.items) {
        Object.values(blueprint.items).forEach(item => {
            const val = item.defaultValue;
            // Lógica de valor inicial baseada no tipo
            if (item.type === 'skills') state.skills[item.id] = {};
            else if (item.type === 'inventory') state.inventory[item.id] = [];
            else if (item.type === 'abilities') state.abilities[item.id] = [];
            else if (item.type === 'resources') state.resources[item.id] = { current: val || 10, max: val || 10 };
            else if (item.type === 'toggles') state.toggles[item.id] = val || false;
            else if (state[item.type]) state[item.type][item.id] = val;
        });
    } 
    // FALLBACK PARA FORMATO ANTIGO (Arrays)
    else {
        blueprint.attributes?.forEach(x => state.attributes[x.id] = x.defaultValue || 10);
        blueprint.counters?.forEach(x => state.counters[x.id] = x.defaultValue || 0);
        blueprint.resources?.forEach(x => state.resources[x.id] = { current: x.defaultValue || 10, max: x.defaultValue || 10 });
        blueprint.headers?.forEach(x => state.headers[x.id] = "");
        blueprint.longTexts?.forEach(x => state.longTexts[x.id] = "");
        blueprint.toggles?.forEach(x => state.toggles[x.id] = false);
        blueprint.skills?.forEach(x => state.skills[x.id] = {});
        blueprint.abilities?.forEach(x => state.abilities[x.id] = []);
        blueprint.inventory?.forEach(x => state.inventory[x.id] = []);
    }

    return state;
};

// Exporta o mapa de componentes para que o SystemBuilder possa usar
export const WIDGET_REGISTRY = {
    headers: { comp: HeaderWidget, label: "Info / Cabeçalho" },
    attributes: { comp: AttributeWidget, label: "Atributo Numérico" },
    resources: { comp: ResourceWidget, label: "Barra de Recurso" },
    counters: { comp: CounterWidget, label: "Contador Simples" },
    toggles: { comp: ToggleWidget, label: "Interruptor (On/Off)" },
    longTexts: { comp: LongTextWidget, label: "Texto Longo" },
    skills: { comp: SkillsWidget, label: "Lista de Perícias" },
    abilities: { comp: AbilitiesWidget, label: "Lista de Habilidades" },
    inventory: { comp: InventoryWidget, label: "Inventário" },
    separators: { comp: SeparatorWidget, label: "Divisor Visual" }
};

// Renderizador Mestre (Compartilhado entre Editor e Viewer)
const MasterRenderer = ({ systemDef, data, onUpdate, readOnly }) => {
    if (!systemDef) return null;

    // Fallback para sistemas antigos
    if (Array.isArray(systemDef.layout) && typeof systemDef.layout[0] === 'string') {
        return <div className="text-orange-500 text-xs p-2">Sistema em formato legado. Abra no Editor para converter.</div>;
    }

    const layout = systemDef.layout || [];
    const itemsDef = systemDef.items || {};

    return (
        <div className="space-y-4 w-full">
            {layout.map(row => (
                <div key={row.id} className="w-full flex gap-4">
                    {row.columns.map((colItems, colIndex) => (
                        <div key={`${row.id}-col-${colIndex}`} 
                             className="flex-1 flex flex-col gap-3 min-w-0">
                            
                            {colItems.map(itemId => {
                                const itemDef = itemsDef[itemId];
                                if (!itemDef) return null;
                                
                                const Config = WIDGET_REGISTRY[itemDef.type];
                                if (!Config) return null;
                                const Component = Config.comp;

                                return (
                                    <div key={itemId} className="w-full">
                                        <Component 
                                            data={itemDef} 
                                            value={data[itemDef.type]?.[itemId]} 
                                            onChange={(id, val) => onUpdate(itemDef.type, id, val)} 
                                            readOnly={readOnly}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export const Editor = ({ data, updateData, systemDef }) => {
    if (!systemDef) return <div className="p-4 text-red-500">Erro: Sistema não encontrado.</div>;

    const handleUpdate = (cat, id, val) => {
        // Tratamento especial para objetos aninhados (Recursos)
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
            <div className={`${THEME_CARD} p-4 mt-6`}>
                <label className={THEME_LABEL + " mb-2 block"}>ANOTAÇÕES GERAIS</label>
                <textarea className={THEME_BG_INPUT + " w-full rounded-xl p-3 text-xs h-32 resize-none"}
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
                <div className={`${THEME_CARD} p-5 mt-6`}>
                    <div className={THEME_LABEL + " mb-3 border-b border-white/5 pb-2"}>ANOTAÇÕES</div>
                    <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-80 overflow-y-auto scrollbar-thin leading-relaxed pl-1">
                        {data.notes}
                    </div>
                </div>
            )}
        </div>
    );
};