import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Trash2, Save, X, Layout, Activity, Heart, 
    AlertCircle, Type, List, Zap, AlignLeft, 
    ToggleLeft, Minus, ArrowLeft, Package, Settings
} from 'lucide-react';
import * as GenericSystem from '../../systems/generic_system';
import { useGame } from '../../context/GameContext';

// Estilos Reutilizáveis
const BTN_TOOL = "flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/40 hover:bg-white/10 hover:border-[#d084ff]/30 transition-all text-xs font-bold uppercase text-gray-400 hover:text-white text-left group relative overflow-hidden active:scale-95";
const INPUT_STYLE = "w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#d084ff] focus:shadow-[0_0_10px_rgba(208,132,255,0.2)] transition-all";
const SECTION_TITLE = "text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2 mt-4 ml-1";

// Componente de Segurança para Widgets (Evita Crash se o Widget falhar)
const SafeWidget = ({ component: Component, ...props }) => {
    if (!Component) return <div className="text-red-500 text-[10px] p-2 border border-red-500/30 rounded">Widget não encontrado</div>;
    try {
        return <Component {...props} />;
    } catch (e) {
        console.error("Erro ao renderizar widget:", e);
        return <div className="text-red-500 text-[10px]">Erro no Widget</div>;
    }
};

export const SystemBuilder = ({ systemToEdit, onSave, onCancel }) => {
    const { setIsSystemBuilderOpen } = useGame();

    // Garante que o modal avise o contexto global
    useEffect(() => {
        setIsSystemBuilderOpen(true);
        return () => setIsSystemBuilderOpen(false);
    }, [setIsSystemBuilderOpen]);

    // Inicialização segura do estado
    const [blueprint, setBlueprint] = useState(() => {
        const b = systemToEdit || {};
        return {
            name: b.name || "Novo Sistema",
            headers: Array.isArray(b.headers) ? b.headers : [],
            attributes: Array.isArray(b.attributes) ? b.attributes : [],
            resources: Array.isArray(b.resources) ? b.resources : [],
            counters: Array.isArray(b.counters) ? b.counters : [],
            longTexts: Array.isArray(b.longTexts) ? b.longTexts : [],
            toggles: Array.isArray(b.toggles) ? b.toggles : [],
            separators: Array.isArray(b.separators) ? b.separators : [],
            skills: Array.isArray(b.skills) ? b.skills : [],
            abilities: Array.isArray(b.abilities) ? b.abilities : [],
            inventory: Array.isArray(b.inventory) ? b.inventory : [],
            notes: b.notes !== false
        };
    });

    const [selectedId, setSelectedId] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [newSkillOption, setNewSkillOption] = useState("");

    const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const addField = (type) => {
        let label = 'Campo';
        let prefix = 'field';
        
        switch(type) {
            case 'headers': label='Info'; prefix='head'; break;
            case 'attributes': label='Atributo'; prefix='attr'; break;
            case 'resources': label='Recurso'; prefix='res'; break;
            case 'counters': label='Contador'; prefix='cnt'; break;
            case 'longTexts': label='Texto'; prefix='txt'; break;
            case 'toggles': label='Opção'; prefix='tgl'; break;
            case 'separators': label='Divisor'; prefix='sep'; break;
            case 'skills': label='Perícias'; prefix='skill'; break;
            case 'abilities': label='Habilidades'; prefix='abil'; break;
            case 'inventory': label='Mochila'; prefix='inv'; break;
            default: break;
        }

        const newItem = { 
            id: generateId(prefix), 
            label, 
            defaultValue: type === 'toggles' ? false : 0 
        };

        if (type === 'resources' || type === 'attributes') newItem.color = '#d084ff';
        if (type === 'skills') newItem.options = ['Opção A'];
        if (type === 'separators') newItem.label = '';
        if (type === 'inventory') newItem.defaultValue = 10; 

        setBlueprint(prev => ({ 
            ...prev, 
            [type]: [...(prev[type] || []), newItem] 
        }));
    };

    const updateSelected = (updates) => {
        if (!selectedType || !selectedId) return;
        setBlueprint(prev => ({
            ...prev,
            [selectedType]: prev[selectedType].map(i => i.id === selectedId ? { ...i, ...updates } : i)
        }));
    };

    const removeSelected = () => {
        if (!selectedType || !selectedId) return;
        setBlueprint(prev => ({ 
            ...prev, 
            [selectedType]: prev[selectedType].filter(i => i.id !== selectedId) 
        }));
        setSelectedId(null);
        setSelectedType(null);
    };

    // Memoização para evitar crashes na busca do item ativo
    const activeItem = useMemo(() => {
        if (!selectedId || !selectedType || !blueprint[selectedType]) return null;
        return blueprint[selectedType].find(i => i.id === selectedId) || null;
    }, [selectedId, selectedType, blueprint]);

    // Handlers seguros para Skills
    const addSkillOption = () => {
        if (!newSkillOption.trim() || !activeItem) return;
        const currentOptions = Array.isArray(activeItem.options) ? activeItem.options : [];
        updateSelected({ options: [...currentOptions, newSkillOption.trim()] });
        setNewSkillOption("");
    };

    const removeSkillOption = (idx) => {
        if (!activeItem) return;
        const newOptions = [...(activeItem.options || [])];
        newOptions.splice(idx, 1);
        updateSelected({ options: newOptions });
    };

    const select = (id, type) => { setSelectedId(id); setSelectedType(type); };

    // Verifica se há algum item para mostrar o estado vazio
    const hasAnyItem = Object.values(blueprint).some(arr => Array.isArray(arr) && arr.length > 0);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c] text-white animate-in fade-in duration-300 w-full font-inter select-none">
            {/* HEADER */}
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-[#d084ff]/20 to-purple-900/20 rounded-xl border border-[#d084ff]/30 shadow-[0_0_15px_rgba(208,132,255,0.15)]">
                        <Layout className="text-[#d084ff]" size={22} />
                    </div>
                    <div>
                        <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Editor de Sistema</h2>
                        <input className="bg-transparent border-none text-xl font-rajdhani font-bold text-white p-0 focus:ring-0 w-64 placeholder-white/20"
                            value={blueprint.name} onChange={e => setBlueprint({...blueprint, name: e.target.value})} placeholder="Nome do Sistema..." />
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white"><X size={24}/></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* TOOLBAR */}
                <div className="w-[300px] bg-[#121216] border-r border-white/5 flex flex-col overflow-y-auto p-5 gap-6 shrink-0 custom-scrollbar">
                    {!activeItem ? (
                        <div className="animate-in slide-in-from-left-4 duration-300 pb-10">
                            <div className={SECTION_TITLE}>Dados Básicos</div>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => addField('headers')} className={BTN_TOOL}><Type size={18} className="text-gray-500 group-hover:text-white"/> Texto Curto</button>
                                <button onClick={() => addField('longTexts')} className={BTN_TOOL}><AlignLeft size={18} className="text-gray-500 group-hover:text-white"/> Texto Longo</button>
                                <button onClick={() => addField('separators')} className={BTN_TOOL}><Minus size={18} className="text-gray-600 group-hover:text-white"/> Divisor</button>
                            </div>

                            <div className={SECTION_TITLE}>Estatísticas</div>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => addField('attributes')} className={BTN_TOOL}><Activity size={18} className="text-amber-500"/> Atributo (Grande)</button>
                                <button onClick={() => addField('counters')} className={BTN_TOOL}><Plus size={18} className="text-green-500"/> Contador Simples</button>
                                <button onClick={() => addField('resources')} className={BTN_TOOL}><Heart size={18} className="text-red-500"/> Barra Recurso</button>
                            </div>

                            <div className={SECTION_TITLE}>Ferramentas</div>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => addField('inventory')} className={BTN_TOOL}><Package size={18} className="text-orange-500"/> Inventário</button>
                                <button onClick={() => addField('toggles')} className={BTN_TOOL}><ToggleLeft size={18} className="text-purple-500"/> Interruptor</button>
                                <button onClick={() => addField('skills')} className={BTN_TOOL}><List size={18} className="text-blue-500"/> Lista Opções</button>
                                <button onClick={() => addField('abilities')} className={BTN_TOOL}><Zap size={18} className="text-yellow-500"/> Lista Dinâmica</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2 text-[#d084ff]">
                                    <Settings size={14} />
                                    <h3 className="text-xs font-bold uppercase tracking-widest">Editar Campo</h3>
                                </div>
                                <button onClick={() => {setSelectedId(null); setSelectedType(null);}} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 transition-colors"><ArrowLeft size={12}/> Voltar</button>
                            </div>

                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1.5 font-bold uppercase tracking-wider">Rótulo Visual</label>
                                <input className={INPUT_STYLE} value={activeItem.label || ''} onChange={e => updateSelected({ label: e.target.value })} />
                            </div>

                            {(selectedType === 'attributes' || selectedType === 'resources') && (
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
                                    <div>
                                        <label className="text-[10px] text-gray-400 block mb-2 font-bold uppercase tracking-wider">Cor do Tema</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" className="h-8 w-8 bg-transparent border-none cursor-pointer rounded overflow-hidden" value={activeItem.color || '#d084ff'} onChange={e => updateSelected({ color: e.target.value })} />
                                            <span className="text-xs font-mono text-gray-300">{activeItem.color || '#d084ff'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Valor Padrão</label>
                                        <input type="number" className={INPUT_STYLE} value={activeItem.defaultValue || 0} onChange={e => updateSelected({ defaultValue: parseInt(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            )}

                            {(selectedType === 'counters' || selectedType === 'inventory') && (
                                <div>
                                    <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">
                                        {selectedType === 'inventory' ? 'Carga Máxima' : 'Valor Inicial'}
                                    </label>
                                    <input type="number" className={INPUT_STYLE} value={activeItem.defaultValue || 0} onChange={e => updateSelected({ defaultValue: parseInt(e.target.value) || 0 })} />
                                </div>
                            )}

                            {selectedType === 'skills' && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <label className="text-[10px] text-gray-400 block mb-2 font-bold uppercase tracking-wider">Opções da Lista</label>
                                    <div className="flex gap-2 mb-3">
                                        <input className={INPUT_STYLE} placeholder="Nova opção..." value={newSkillOption} onChange={e => setNewSkillOption(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkillOption()} />
                                        <button onClick={addSkillOption} className="bg-[#d084ff]/20 p-2 rounded-lg text-[#d084ff] hover:bg-[#d084ff] hover:text-black transition-all"><Plus size={16}/></button>
                                    </div>
                                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                                        {(activeItem.options || []).map((opt, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-black/40 border border-white/5 px-3 py-2 rounded-lg text-xs group">
                                                <span className="text-gray-300">{opt}</span>
                                                <button onClick={() => removeSkillOption(idx)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 mt-auto">
                                <button onClick={removeSelected} className="w-full flex items-center justify-center gap-2 p-3 bg-red-900/10 border border-red-900/30 text-red-400 hover:bg-red-900/30 hover:border-red-500 hover:text-red-200 rounded-xl text-xs font-bold transition-all uppercase tracking-widest">
                                    <Trash2 size={14}/> Excluir Campo
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* PREVIEW AREA */}
                <div className="flex-1 bg-gradient-to-br from-[#0a0a0c] to-[#121216] p-10 overflow-y-auto flex justify-center custom-scrollbar">
                    <div className="w-full max-w-4xl space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="flex justify-center">
                            <span className="text-[10px] uppercase tracking-[0.3em] text-gray-600 border border-white/5 px-4 py-1.5 rounded-full">Preview da Ficha</span>
                        </div>

                        {/* HEADERS */}
                        <div className="flex flex-wrap gap-4 justify-center">
                            {blueprint.headers?.map(h => (
                                <div key={h.id} onClick={()=>select(h.id,'headers')} className={`cursor-pointer ring-2 rounded-lg ${selectedId===h.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}>
                                    <SafeWidget component={GenericSystem.HeaderWidget} data={h} value={h.label} readOnly/>
                                </div>
                            ))}
                        </div>

                        {/* ATTRIBUTES */}
                        {blueprint.attributes?.length > 0 && (
                            <div className="flex gap-2 w-full">
                                {blueprint.attributes.map(h => (
                                    <div key={h.id} onClick={()=>select(h.id,'attributes')} className={`flex-1 cursor-pointer ring-2 rounded-xl transition-all ${selectedId===h.id?'ring-[#d084ff] shadow-[0_0_20px_rgba(208,132,255,0.3)]':'ring-transparent hover:ring-white/20'}`}>
                                        <SafeWidget component={GenericSystem.AttributeWidget} data={h} value={h.defaultValue} readOnly/>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* RESOURCES */}
                        <div className="grid grid-cols-2 gap-4">
                            {blueprint.resources?.map(h => (
                                <div key={h.id} onClick={()=>select(h.id,'resources')} className={`cursor-pointer ring-2 rounded-lg ${selectedId===h.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}>
                                    <SafeWidget component={GenericSystem.ResourceWidget} data={h} value={{current: h.defaultValue || 10, max: h.defaultValue || 10}} readOnly/>
                                </div>
                            ))}
                        </div>

                        {/* COUNTERS & TOGGLES */}
                        <div className="grid grid-cols-2 gap-4">
                            {blueprint.toggles?.map(h => (
                                <div key={h.id} onClick={()=>select(h.id,'toggles')} className={`cursor-pointer ring-2 rounded-lg ${selectedId===h.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}>
                                    <SafeWidget component={GenericSystem.ToggleWidget} data={h} value={true} readOnly/>
                                </div>
                            ))}
                            {blueprint.counters?.map(h => (
                                <div key={h.id} onClick={()=>select(h.id,'counters')} className={`cursor-pointer ring-2 rounded-lg ${selectedId===h.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}>
                                    <SafeWidget component={GenericSystem.CounterWidget} data={h} value={h.defaultValue} readOnly/>
                                </div>
                            ))}
                        </div>

                        {/* FLUID LISTS */}
                        <div className="space-y-4">
                            {blueprint.inventory?.map(i => <div key={i.id} onClick={()=>select(i.id,'inventory')} className={`cursor-pointer ring-2 rounded-xl ${selectedId===i.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}><SafeWidget component={GenericSystem.InventoryWidget} data={i} value={[]} readOnly/></div>)}
                            {blueprint.separators?.map(h => <div key={h.id} onClick={()=>select(h.id,'separators')} className={`cursor-pointer ring-2 rounded ${selectedId===h.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}><SafeWidget component={GenericSystem.SeparatorWidget} data={h}/></div>)}
                            {blueprint.longTexts?.map(h => <div key={h.id} onClick={()=>select(h.id,'longTexts')} className={`cursor-pointer ring-2 rounded-xl ${selectedId===h.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}><SafeWidget component={GenericSystem.LongTextWidget} data={h} value="Texto exemplo..." readOnly/></div>)}
                            {blueprint.skills?.map(h => <div key={h.id} onClick={()=>select(h.id,'skills')} className={`cursor-pointer ring-2 rounded-xl ${selectedId===h.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}><SafeWidget component={GenericSystem.SkillsWidget} data={h} value={{}} readOnly/></div>)}
                            {blueprint.abilities?.map(h => <div key={h.id} onClick={()=>select(h.id,'abilities')} className={`cursor-pointer ring-2 rounded-xl ${selectedId===h.id?'ring-[#d084ff]':'ring-transparent hover:ring-white/20'}`}><SafeWidget component={GenericSystem.AbilitiesWidget} data={h} value={[]} readOnly/></div>)}
                        </div>

                        {/* Empty State */}
                        {!hasAnyItem && (
                            <div className="h-64 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600 gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20"><Layout size={32}/></div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Canvas Vazio</p>
                                    <p className="text-xs text-gray-700 mt-1">Adicione componentes usando o menu lateral.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-end gap-4">
                <button onClick={onCancel} className="px-8 py-3 text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">Cancelar</button>
                <button onClick={() => onSave(blueprint)} 
                    className="px-8 py-3 bg-[#d084ff] hover:bg-white text-black font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(208,132,255,0.3)] hover:shadow-[0_0_30px_rgba(208,132,255,0.5)] transition-all flex items-center gap-3 uppercase tracking-widest transform hover:-translate-y-1">
                    <Save size={16}/> Salvar Sistema
                </button>
            </div>
        </div>
    );
};