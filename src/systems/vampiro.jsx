// src/systems/vtm_v5.jsx
import React from 'react';
import { Droplet, Heart, Brain, Scroll, Zap, Ghost } from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL ---
// Tema "Sangue" (Vermelho Profundo/Carmesim)
const THEME_COLOR = "text-red-500";
const THEME_BORDER = "border-red-800/50";
const THEME_GLOW = "shadow-[0_0_15px_rgba(220,38,38,0.3)]";
const THEME_BG_BTN = "bg-red-900/30 hover:bg-red-600 hover:text-white";

// --- DADOS DO SISTEMA (PT-BR) ---
// Estrutura 3x3 de Atributos do V5
const ATTRIBUTES_GRID = [
    { cat: 'Físico', keys: [{id:'for', l:'Força'}, {id:'des', l:'Destreza'}, {id:'vig', l:'Vigor'}] },
    { cat: 'Social', keys: [{id:'car', l:'Carisma'}, {id:'man', l:'Manipulação'}, {id:'aut', l:'Autocontrole'}] },
    { cat: 'Mental', keys: [{id:'int', l:'Inteligência'}, {id:'ast', l:'Astúcia'}, {id:'res', l:'Resolução'}] },
];

const ALL_SKILLS = [
    'Armas Brancas', 'Armas de Fogo', 'Atletismo', 'Briga', 'Condução', 'Furtividade', 'Latrocínio', 'Ofícios', 'Sobrevivência',
    'Empatia com Animais', 'Etiqueta', 'Intimidação', 'Liderança', 'Manha', 'Performance', 'Persuasão', 'Sagacidade', 'Subterrúgio',
    'Acadêmicos', 'Ciência', 'Finanças', 'Investigação', 'Medicina', 'Ocultismo', 'Política', 'Tecnologia', 'Consciência'
];

// Utilitários
const handleNumber = (value) => {
    const clean = value.replace(/\D/g, '').slice(0, 2);
    return clean === '' ? 0 : parseInt(clean);
};

// 1. METADADOS E ESTADO PADRÃO
export const SYSTEM_ID = 'vtm_v5';
export const SYSTEM_NAME = 'Vampiro: A Máscara';
export const SYSTEM_DESC = 'Horror Pessoal e Político (V5).';

export const defaultState = {
    identity: { name: "Neófito", clan: "Ventrue", gen: "12ª", predator: "Consensualista" },
    // Vitais
    hp: 7, hpMax: 7,       
    wp: 6, wpMax: 6,       
    hunger: 1, hungerMax: 5,
    humanity: 7,             
    bloodPotency: 1,         
    // Atributos
    attrs: {
        for: 1, des: 1, vig: 1,
        car: 1, man: 1, aut: 1,
        int: 1, ast: 1, res: 1
    },
    // Perícias
    skills: {}, 
    disciplines: "Fortitude 2\nDominação 1",
    notes: ""
};

// 2. COMPONENTE DE EDIÇÃO
export const Editor = ({ data, updateData }) => {
    const handleFocus = (e) => e.target.select();

    const updateIdentity = (field, val) => {
        updateData({ identity: { ...data.identity, [field]: val } });
    };

    const updateAttr = (id, val) => {
        updateData({ attrs: { ...data.attrs, [id]: handleNumber(val) } });
    };

    const skillKey = (label) => label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');

    return (
        <div className="space-y-3 h-full overflow-y-auto pr-1">
            {/* Cabeçalho: Identidade */}
            <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 flex gap-2">
                     <input className="flex-[2] bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-red-500"
                         placeholder="Clã (ex: Toreador)"
                         value={data.identity?.clan || ''} 
                         onChange={e => updateIdentity('clan', e.target.value)}/>
                     <input className="flex-[1] bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-red-500 text-center"
                         placeholder="Geração"
                         value={data.identity?.gen || ''} 
                         onChange={e => updateIdentity('gen', e.target.value)}/>
                </div>
                <input className="col-span-2 bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-red-500"
                         placeholder="Tipo de Predador"
                         value={data.identity?.predator || ''} 
                         onChange={e => updateIdentity('predator', e.target.value)}/>
            </div>

             {/* Vitais e Outros Status */}
            <div className="bg-red-950/20 p-2 rounded border border-red-800/30 grid grid-cols-4 gap-2">
                <div className="col-span-2">
                    <label className="text-[9px] text-gray-400 block text-center uppercase">Vitalidade Máx</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-red-500"
                        value={data.hpMax || 7} onChange={e => updateData({ hpMax: handleNumber(e.target.value) })}/>
                </div>
                 <div className="col-span-2">
                    <label className="text-[9px] text-gray-400 block text-center uppercase">F. Vontade Máx</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-indigo-400"
                        value={data.wpMax || 6} onChange={e => updateData({ wpMax: handleNumber(e.target.value) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-red-400 block text-center font-bold">FOME</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-red-500 font-bold"
                        value={data.hunger || 1} onChange={e => updateData({ hunger: Math.min(5, handleNumber(e.target.value)) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-gray-400 block text-center uppercase">Humanidade</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-white"
                        value={data.humanity || 7} onChange={e => updateData({ humanity: handleNumber(e.target.value) })}/>
                </div>
                 <div className="col-span-2">
                    <label className="text-[9px] text-gray-400 block text-center uppercase">Potência Sangue</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-red-500"
                        value={data.bloodPotency || 1} onChange={e => updateData({ bloodPotency: handleNumber(e.target.value) })}/>
                </div>
            </div>

            {/* Grid de Atributos (3x3) */}
            <div>
                <label className="text-xs text-gray-400 mb-0.5 block text-center tracking-widest uppercase">Atributos</label>
                <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded border border-glass-border">
                    {ATTRIBUTES_GRID.map((row, i) => (
                        <React.Fragment key={i}>
                            {row.keys.map(attr => (
                                <div key={attr.id} className="flex flex-col">
                                    <label className="text-[8px] text-gray-500 text-center uppercase truncate">{attr.l}</label>
                                    <input type="text" onFocus={handleFocus}
                                        className="bg-black/50 border border-glass-border rounded p-1 text-white text-center font-bold outline-none focus:border-red-500 font-rajdhani text-lg"
                                        value={data.attrs?.[attr.id] || 1} 
                                        onChange={e => updateAttr(attr.id, e.target.value)}/>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Lista de Perícias */}
            <div>
                <label className="text-xs text-gray-400 mb-0.5 block">Perícias</label>
                <div className="bg-black/20 p-2 rounded border border-glass-border grid grid-cols-2 gap-x-2 gap-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                    {ALL_SKILLS.map(label => {
                        const key = skillKey(label);
                        return (
                        <div key={key} className="flex items-center justify-between gap-1 border-b border-white/5 pb-1">
                            <span className="text-[10px] text-gray-300 truncate">{label}</span>
                            <input type="text" onFocus={handleFocus}
                                className="w-8 bg-black/50 border border-glass-border rounded p-0.5 text-white text-center text-sm outline-none focus:border-red-400 font-rajdhani"
                                value={data.skills?.[key] || 0}
                                onChange={e => updateData({ skills: { ...data.skills, [key]: handleNumber(e.target.value) } })}/>
                        </div>
                    )})}
                </div>
            </div>

            {/* Disciplinas */}
            <div>
                <label className="text-xs text-gray-400 mb-0.5 block">Disciplinas & Vantagens</label>
                <textarea className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-red-500 h-24 resize-none scrollbar-thin"
                    value={data.disciplines || ''} onChange={e=>updateData({ disciplines:e.target.value })}/>
            </div>
        </div>
    );
};

// 3. COMPONENTE DE VISUALIZAÇÃO
export const Viewer = ({ data, updateData }) => {
    const adjustStat = (stat, maxVal, amount) => {
        const current = data[stat] || 0;
        const maximum = typeof maxVal === 'string' ? (data[maxVal] || 1) : maxVal;
        const newVal = Math.min(maximum, Math.max(0, current + amount));
        updateData({ [stat]: newVal });
    };

    const skillKey = (label) => label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    const trainedSkills = ALL_SKILLS.filter(label => (data.skills?.[skillKey(label)] || 0) > 0);

    return (
        <>
            {/* 0. IDENTIDADE - CORRIGIDO (Evita estouro horizontal) */}
            <div className="flex justify-center mb-2 -mt-1 w-full">
                <div className="max-w-full flex items-center justify-center bg-black/60 border border-red-900/30 rounded-full px-3 py-1 gap-2 shadow-sm backdrop-blur-sm overflow-hidden">
                    <span className={`text-xs font-bold ${THEME_COLOR} font-rajdhani uppercase tracking-widest truncate shrink`}>
                        {data.identity?.clan || 'Cainita'}
                    </span>
                    {data.identity?.gen && (
                        <>
                            <span className="text-red-800 text-[8px] shrink-0">•</span>
                            <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap truncate">
                                {data.identity?.gen}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* 1. HEADER ESPECIAL: FOME */}
            <div className="mb-3 relative">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-black/80 px-2 rounded-full z-20 border border-red-950">
                    <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1"><Droplet size={8} fill="currentColor"/> Fome</span>
                </div>
                {/* Barra Fome */}
                <div className={`h-[45px] flex items-center justify-between bg-black/40 border ${THEME_BORDER} rounded-xl p-1 ${THEME_GLOW} relative overflow-hidden mt-1`}>
                    <div className="absolute left-0 top-0 bottom-0 bg-red-600/90 z-0 transition-all duration-500" 
                         style={{ width: `${(data.hunger / 5) * 100}%` }} />

                    <button onClick={() => adjustStat('hunger', 5, -1)} 
                        className={`z-10 w-8 h-full flex items-center justify-center text-lg rounded ${THEME_BG_BTN} pb-1`}>-</button>
                    
                    <div className="flex flex-col items-center justify-center leading-none flex-1 z-10 mix-blend-screen">
                        <input type="text" maxLength={1} value={data.hunger}
                            onChange={(e) => updateData({ hunger: Math.min(5, handleNumber(e.target.value)) })}
                            onFocus={(e) => e.target.select()}
                            className="w-12 bg-transparent text-3xl font-rajdhani font-bold text-white text-center outline-none drop-shadow-[0_2px_2px_rgba(0,0,0,1)] focus:text-red-300" />
                    </div>

                    <button onClick={() => adjustStat('hunger', 5, 1)} 
                        className={`z-10 w-8 h-full flex items-center justify-center text-lg rounded ${THEME_BG_BTN} pb-1`}>+</button>
                </div>
            </div>

            {/* 2. VITAIS DUPLOS */}
            <div className="flex gap-2 mb-4 h-[50px]">
                {/* VITALIDADE */}
                <div className="flex-1 flex items-center justify-between bg-red-950/20 border border-red-800/40 rounded-lg px-1 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 bg-red-800/20 z-0 transition-all duration-500" style={{ width: `${(data.hp / (data.hpMax || 1)) * 100}%` }} />
                    <button onClick={() => adjustStat('hp', 'hpMax', -1)} className="z-10 w-6 h-full text-gray-500 hover:text-red-400 text-lg flex items-center justify-center pb-1">-</button>
                    <div className="flex flex-col items-center leading-none z-10">
                         <Heart size={12} className="text-red-500 mb-0.5"/>
                         <span className="text-xl font-rajdhani font-bold text-white">
                            {data.hp} <span className="text-xs text-gray-400">/ {data.hpMax}</span>
                         </span>
                    </div>
                    <button onClick={() => adjustStat('hp', 'hpMax', 1)} className="z-10 w-6 h-full text-gray-500 hover:text-red-400 text-lg flex items-center justify-center pb-1">+</button>
                </div>

                {/* FORÇA DE VONTADE */}
                <div className="flex-1 flex items-center justify-between bg-indigo-950/20 border border-indigo-800/40 rounded-lg px-1 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 bg-indigo-800/20 z-0 transition-all duration-500" style={{ width: `${(data.wp / (data.wpMax || 1)) * 100}%` }} />
                    <button onClick={() => adjustStat('wp', 'wpMax', -1)} className="z-10 w-6 h-full text-gray-500 hover:text-indigo-400 text-lg flex items-center justify-center pb-1">-</button>
                    <div className="flex flex-col items-center leading-none z-10">
                         <Brain size={12} className="text-indigo-400 mb-0.5"/>
                         <span className="text-xl font-rajdhani font-bold text-white">
                            {data.wp} <span className="text-xs text-gray-400">/ {data.wpMax}</span>
                         </span>
                    </div>
                    <button onClick={() => adjustStat('wp', 'wpMax', 1)} className="z-10 w-6 h-full text-gray-500 hover:text-indigo-400 text-lg flex items-center justify-center pb-1">+</button>
                </div>
            </div>

            {/* 3. GRID DE ATRIBUTOS */}
            <div className="mb-4 bg-black/40 border border-glass-border rounded-xl p-2 shadow-inner">
                <div className="grid grid-cols-3 gap-1">
                    <div className="col-span-3 grid grid-cols-3 mb-1">
                        {ATTRIBUTES_GRID.map(g => <span key={g.cat} className="text-[8px] text-center text-gray-500 uppercase tracking-wider">{g.cat}</span>)}
                    </div>
                    {[0, 1, 2].map(rowIndex => (
                        <React.Fragment key={rowIndex}>
                            {ATTRIBUTES_GRID.map((col, colIndex) => {
                                const attr = col.keys[rowIndex];
                                const val = data.attrs?.[attr.id] || 1;
                                return (
                                    <div key={attr.id} className="flex flex-col items-center group bg-black/30 rounded border border-white/5 p-1 hover:border-red-500/30 transition-colors relative overflow-hidden">
                                        <span className="text-[8px] text-gray-400 group-hover:text-red-300">{attr.l}</span>
                                        <span className={`text-lg font-rajdhani font-bold ${THEME_COLOR} relative z-10`}>{val}</span>
                                        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 h-1 opacity-20">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`w-1 h-1 rounded-full ${i < val ? 'bg-red-500' : 'bg-gray-700'}`}></div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* 4. CONTEÚDO */}
            <div className="flex gap-2 mb-2 flex-1 min-h-[120px]">
                <div className="flex-[3] bg-glass border border-glass-border rounded-xl p-2 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 border-b border-glass-border pb-1">
                        <Zap size={12} className={THEME_COLOR} />
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Disciplinas</span>
                    </div>
                    <div className="text-xs text-gray-300 whitespace-pre-line overflow-y-auto scrollbar-thin pr-1 font-mono leading-relaxed">
                        {data.disciplines || <span className="text-gray-600 italic">Nenhuma manifestada.</span>}
                    </div>
                </div>

                <div className="flex-[2] bg-glass border border-glass-border rounded-xl p-0 overflow-hidden flex flex-col">
                     <div className="bg-white/5 p-1 text-center border-b border-white/5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center justify-center gap-1"><Scroll size={10}/> Perícias</span>
                     </div>
                     <div className="overflow-y-auto p-1 scrollbar-thin flex-1">
                        {trainedSkills.length > 0 ? trainedSkills.map(label => {
                            const val = data.skills[skillKey(label)];
                            return (
                            <div key={label} className="flex justify-between items-center px-2 py-0.5 mb-1 rounded bg-black/30 border border-white/5 group hover:border-red-500/30">
                                <span className="text-[9px] text-gray-400 truncate max-w-[80px] group-hover:text-gray-200">{label}</span>
                                <span className={`text-[11px] font-bold ${THEME_COLOR} font-rajdhani`}>{val}</span>
                            </div>
                        )}) : (
                            <div className="text-[9px] text-center text-gray-600 mt-4 italic">Inepto</div>
                        )}
                     </div>
                </div>
            </div>

            {/* Rodapé */}
            <div className="flex justify-between items-center text-[10px] text-gray-500 px-2 py-1 bg-black/20 rounded-lg border border-white/5">
                <span className="flex items-center gap-1" title="Humanidade">
                    <Ghost size={12} className="text-gray-400"/> 
                    Humanidade: <b className="text-white font-rajdhani text-xs">{data.humanity}</b>
                </span>
                <span className="flex items-center gap-1" title="Potência do Sangue">
                    <Droplet size={12} className="text-red-700"/> 
                    Potência: <b className="text-red-400 font-rajdhani text-xs">{data.bloodPotency}</b>
                </span>
            </div>
        </>
    );
};