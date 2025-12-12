// src/systems/ordem_paranormal.jsx
import React from 'react';
import { Shield, Zap, Brain, Ghost, Crosshair } from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL ---
const THEME_COLOR = "text-emerald-400";
const THEME_BORDER = "border-emerald-500/40";
const THEME_GLOW = "shadow-[0_0_15px_rgba(52,211,153,0.2)]";
const THEME_BG_BTN = "bg-emerald-400/10 hover:bg-emerald-400 hover:text-black";

// --- DADOS DO SISTEMA (PT-BR) ---
const ATTR_LABELS = {
    agi: 'AGI', for: 'FOR', int: 'INT', 
    pre: 'PRE', vig: 'VIG'
};

// Lista completa baseada na imagem fornecida
const ALL_SKILLS = [
    { id: 'acrobacia', label: 'Acrobacia' },
    { id: 'adestramento', label: 'Adestramento' },
    { id: 'artes', label: 'Artes' },
    { id: 'atletismo', label: 'Atletismo' },
    { id: 'atualidades', label: 'Atualidades' },
    { id: 'ciencias', label: 'Ciências' },
    { id: 'crime', label: 'Crime' },
    { id: 'diplomacia', label: 'Diplomacia' },
    { id: 'enganacao', label: 'Enganação' },
    { id: 'fortitude', label: 'Fortitude' },
    { id: 'furtividade', label: 'Furtividade' },
    { id: 'iniciativa', label: 'Iniciativa' },
    { id: 'intimidacao', label: 'Intimidação' },
    { id: 'intuicao', label: 'Intuição' },
    { id: 'investigacao', label: 'Investigação' },
    { id: 'luta', label: 'Luta' },
    { id: 'medicina', label: 'Medicina' },
    { id: 'ocultismo', label: 'Ocultismo' },
    { id: 'percepcao', label: 'Percepção' },
    { id: 'pilotagem', label: 'Pilotagem' },
    { id: 'pontaria', label: 'Pontaria' },
    { id: 'profissao', label: 'Profissão' },
    { id: 'reflexos', label: 'Reflexos' },
    { id: 'religiao', label: 'Religião' },
    { id: 'sobrevivencia', label: 'Sobrevivência' },
    { id: 'tatica', label: 'Tática' },
    { id: 'tecnologia', label: 'Tecnologia' },
    { id: 'vontade', label: 'Vontade' },
];

// Utilitários
const handleNumber = (value) => {
    const clean = value.replace(/[^0-9-]/g, '').slice(0, 3);
    return clean === '' || clean === '-' ? 0 : parseInt(clean);
};

const formatBonus = (val) => (val > 0 ? `+${val}` : val);

// 1. METADADOS E ESTADO PADRÃO
export const SYSTEM_ID = 'ordem_paranormal';
export const SYSTEM_NAME = 'Ordem Paranormal';
export const SYSTEM_DESC = 'Investigação e Horror Paranormal.';

export const defaultState = {
    identity: { name: "Agente", class: "Combatente", nex: "5%", origin: "Policial" },
    // Vitals
    hp: 20, hpMax: 20,
    san: 12, sanMax: 12,
    pe: 4, peMax: 4,
    // Atributos
    attributes: { agi: 1, for: 2, int: 1, pre: 1, vig: 2 },
    // Defesa
    defesa: 15,
    esquiva: 5,
    // Perícias (Agora suporta a lista completa)
    skills: { luta: 5, pontaria: 2, iniciativa: 5 }, 
    attacks: "Pistola: 2d6 (Crít 19/x2)\nFaca: 1d4 (Crít 19)",
    notes: ""
};

// 2. COMPONENTE DE EDIÇÃO
export const Editor = ({ data, updateData }) => {
    const handleFocus = (e) => e.target.select();
    const ATTR_KEYS = ['agi', 'for', 'int', 'pre', 'vig'];

    const updateIdentity = (field, val) => {
        updateData({ identity: { ...data.identity, [field]: val } });
    };

    const updateSkill = (skillId, val) => {
        updateData({ skills: { ...(data.skills || {}), [skillId]: handleNumber(val) } });
    };

    return (
        <div className="space-y-3 h-full overflow-y-auto pr-1">
            {/* Cabeçalho: Identidade */}
            <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                     <label className="text-xs text-gray-400 mb-0.5 block">Classe e NEX</label>
                     <div className="flex gap-2">
                        <input className="flex-1 bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-emerald-400"
                            placeholder="Ex: Ocultista"
                            value={data.identity?.class || ''} 
                            onChange={e => updateIdentity('class', e.target.value)}/>
                        <input className="w-20 bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-emerald-400 text-center"
                            placeholder="5%"
                            value={data.identity?.nex || ''} 
                            onChange={e => updateIdentity('nex', e.target.value)}/>
                     </div>
                </div>
                <div className="col-span-2">
                    <label className="text-xs text-gray-400 mb-0.5 block">Origem</label>
                    <input className="w-full bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-emerald-400"
                            placeholder="Ex: Policial"
                            value={data.identity?.origin || ''} 
                            onChange={e => updateIdentity('origin', e.target.value)}/>
                </div>
            </div>

            {/* Vitais (PV, SAN, PE) */}
            <div className="grid grid-cols-3 gap-2 bg-emerald-900/10 p-2 rounded border border-emerald-500/20">
                <div>
                    <label className="text-[9px] text-red-400 block text-center font-bold">PV MÁX</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-red-400"
                        value={data.hpMax || 0} onChange={e => updateData({ hpMax: handleNumber(e.target.value) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-blue-400 block text-center font-bold">SAN MÁX</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-blue-400"
                        value={data.sanMax || 0} onChange={e => updateData({ sanMax: handleNumber(e.target.value) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-yellow-400 block text-center font-bold">PE MÁX</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-yellow-400"
                        value={data.peMax || 0} onChange={e => updateData({ peMax: handleNumber(e.target.value) })}/>
                </div>
            </div>

            {/* Defesa */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[9px] text-gray-400 block text-center uppercase">Defesa Passiva</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-emerald-400"
                        value={data.defesa || 10} onChange={e => updateData({ defesa: handleNumber(e.target.value) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-gray-400 block text-center uppercase">Esquiva (Total)</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-emerald-400"
                        value={data.esquiva || 0} onChange={e => updateData({ esquiva: handleNumber(e.target.value) })}/>
                </div>
            </div>
            
            {/* Atributos */}
            <div>
                <label className="text-xs text-gray-400 mb-0.5 block">Atributos</label>
                <div className="bg-black/20 p-2 rounded border border-glass-border grid grid-cols-5 gap-1">
                    {ATTR_KEYS.map(key => (
                        <div key={key}>
                            <label className="text-[9px] text-gray-500 block text-center font-bold">{ATTR_LABELS[key]}</label>
                            <input type="text" onFocus={handleFocus}
                                className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center font-bold outline-none focus:border-emerald-400 font-rajdhani text-lg"
                                value={data.attributes?.[key] || 0} 
                                onChange={e => updateData({ attributes: { ...data.attributes, [key]: handleNumber(e.target.value) } })}/>
                        </div>
                    ))}
                </div>
            </div>

            {/* Perícias Completas (Lista Longa) */}
            <div>
                <label className="text-xs text-gray-400 mb-0.5 block">Perícias</label>
                <div className="bg-black/20 p-2 rounded border border-glass-border grid grid-cols-2 gap-x-3 gap-y-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                    {ALL_SKILLS.map(skill => (
                        <div key={skill.id} className="flex items-center justify-between gap-2 border-b border-white/5 pb-1">
                            <span className="text-[10px] text-gray-300 truncate">{skill.label}</span>
                            <input type="text" onFocus={handleFocus}
                                className="w-10 bg-black/50 border border-glass-border rounded p-0.5 text-white text-center text-xs outline-none focus:border-emerald-400"
                                value={data.skills?.[skill.id] || 0}
                                onChange={e => updateSkill(skill.id, e.target.value)}/>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ataques/Inventário */}
            <div>
                <label className="text-xs text-gray-400 mb-0.5 block">Habilidades</label>
                <textarea className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-emerald-400 h-24 resize-none scrollbar-thin"
                    value={data.attacks || ''} onChange={e=>updateData({ attacks:e.target.value })}/>
            </div>
        </div>
    );
};

// 3. COMPONENTE DE VISUALIZAÇÃO
export const Viewer = ({ data, updateData }) => {
    const ATTR_KEYS = ['agi', 'for', 'int', 'pre', 'vig'];

    const adjustStat = (stat, max, amount) => {
        const current = data[stat] || 0;
        const maximum = data[max] || 0;
        const newVal = Math.min(maximum, Math.max(0, current + amount));
        updateData({ [stat]: newVal });
    };

    // Filtra apenas perícias que possuem bônus para exibir no card
    const trainedSkills = ALL_SKILLS.filter(skill => (data.skills?.[skill.id] || 0) !== 0);

    return (
        <>
            {/* 0. IDENTIDADE */}
            <div className="items-center justify-center mb-2 -mt-1">
                <div className="items-center justify-center bg-black/40 border border-white/10 rounded-full px-4 py-1 flex items-center gap-2 shadow-sm backdrop-blur-sm">
                    <span className={`text-xs font-bold ${THEME_COLOR} font-rajdhani uppercase tracking-widest`}>
                        {data.identity?.class || 'Agente'}
                    </span>
                    <span className="text-gray-600 text-[8px]">•</span>
                    <span className="text-[10px] text-gray-400 font-bold">NEX {data.identity?.nex || '0%'}</span>
                </div>
            </div>

            {/* 1. HEADER: PV */}
            <div className="flex gap-2 mb-2 h-[60px]">
                <div className={`flex-1 flex items-center justify-between bg-red-900/10 border border-red-500/30 rounded-xl p-1 shadow-[0_0_10px_rgba(239,68,68,0.1)] relative overflow-hidden`}>
                    <div className="absolute left-0 top-0 bottom-0 bg-red-600/10 z-0 transition-all duration-500" 
                         style={{ width: `${(data.hp / (data.hpMax || 1)) * 100}%` }} />

                    <button onClick={() => adjustStat('hp', 'hpMax', -1)} 
                        className="z-10 w-8 h-full flex items-center justify-center text-lg rounded bg-red-500/10 hover:bg-red-500 text-red-200 hover:text-black transition-colors pb-1">
                        -
                    </button>
                    
                    <div className="flex flex-col items-center justify-center leading-none flex-1 z-10">
                        <input 
                            type="text"
                            maxLength={3}
                            value={data.hp}
                            onChange={(e) => updateData({ hp: handleNumber(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            className="w-20 bg-transparent text-3xl font-rajdhani font-bold text-white text-center outline-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] focus:text-red-400"
                        />
                        <span className="text-[9px] text-red-400 font-bold tracking-widest uppercase mt-0 pointer-events-none">PV ATUAL / {data.hpMax}</span>
                    </div>

                    <button onClick={() => adjustStat('hp', 'hpMax', 1)} 
                        className="z-10 w-8 h-full flex items-center justify-center text-lg rounded bg-red-500/10 hover:bg-red-500 text-red-200 hover:text-black transition-colors pb-1">
                        +
                    </button>
                </div>
            </div>

            {/* 2. SUB-STATUS: SAN e PE */}
            <div className="flex gap-2 mb-4 h-[45px]">
                {/* Sanidade (Azul) */}
                <div className="flex-1 flex items-center justify-between bg-blue-900/10 border border-blue-500/30 rounded-lg px-1 relative">
                    <button onClick={() => adjustStat('san', 'sanMax', -1)} 
                        className="w-6 h-full text-gray-500 hover:text-blue-400 text-lg flex items-center justify-center pb-1">-</button>
                    
                    <div className="flex flex-col items-center leading-none">
                         <span className="text-xl font-rajdhani font-bold text-blue-100">{data.san}</span>
                         <span className="text-[8px] text-blue-400 font-bold">SAN / {data.sanMax}</span>
                    </div>
                    
                    <button onClick={() => adjustStat('san', 'sanMax', 1)} 
                        className="w-6 h-full text-gray-500 hover:text-blue-400 text-lg flex items-center justify-center pb-1">+</button>
                </div>

                {/* PE (Amarelo) */}
                <div className="flex-1 flex items-center justify-between bg-yellow-900/10 border border-yellow-500/30 rounded-lg px-1 relative">
                    <button onClick={() => adjustStat('pe', 'peMax', -1)} 
                        className="w-6 h-full text-gray-500 hover:text-yellow-400 text-lg flex items-center justify-center pb-1">-</button>
                    
                    <div className="flex flex-col items-center leading-none">
                         <span className="text-xl font-rajdhani font-bold text-yellow-100">{data.pe}</span>
                         <span className="text-[8px] text-yellow-400 font-bold">PE / {data.peMax}</span>
                    </div>
                    
                    <button onClick={() => adjustStat('pe', 'peMax', 1)} 
                        className="w-6 h-full text-gray-500 hover:text-yellow-400 text-lg flex items-center justify-center pb-1">+</button>
                </div>
            </div>

            {/* 3. ATRIBUTOS & DEFESA */}
            <div className="flex gap-2 mb-4">
                <div className="flex-[3] bg-glass border border-glass-border rounded-xl p-2 grid grid-cols-5 gap-1">
                    {ATTR_KEYS.map(key => (
                        <div key={key} className="flex flex-col items-center group">
                            <span className="text-[8px] text-gray-500 font-bold mb-0.5 group-hover:text-emerald-300 transition-colors">{ATTR_LABELS[key]}</span>
                            <div className="bg-black/40 w-full aspect-square rounded border border-white/5 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors">
                                <span className={`text-lg font-rajdhani font-bold text-white`}>
                                    {data.attributes?.[key] || 0}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="flex-[1] bg-glass border border-glass-border rounded-xl p-1 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-0.5 text-gray-600"><Shield size={10}/></div>
                    <span className="text-xl font-bold text-white z-10">{data.defesa}</span>
                    <span className="text-[8px] text-gray-400 uppercase tracking-tighter">DEFESA</span>
                </div>
            </div>

            {/* 4. CONTEÚDO TÁTICO */}
            <div className="flex gap-2 mb-2 flex-1 min-h-[150px]">
                <div className="flex-[3] bg-glass border border-glass-border rounded-xl p-2 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 border-b border-glass-border pb-1">
                        <Crosshair size={12} className={THEME_COLOR} />
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Habilidades</span>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-pre-line overflow-y-auto scrollbar-thin pr-1 font-mono leading-relaxed">
                        {data.attacks || <span className="text-gray-600 italic">Sem armas equipadas.</span>}
                    </div>
                </div>

                {/* Lista de Perícias Treinadas */}
                <div className="flex-[2] bg-glass border border-glass-border rounded-xl p-0 overflow-hidden flex flex-col">
                     <div className="bg-white/5 p-1 text-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Perícias</span>
                     </div>
                     <div className="overflow-y-auto p-1 scrollbar-thin flex-1">
                        {trainedSkills.length > 0 ? trainedSkills.map(skill => (
                            <div key={skill.id} className="flex justify-between items-center px-1.5 py-0.5 mb-1 rounded bg-black/30 border border-white/5">
                                <span className="text-[9px] text-gray-400 truncate max-w-[80px]">{skill.label}</span>
                                <span className={`text-[10px] font-bold ${THEME_COLOR}`}>{formatBonus(data.skills[skill.id])}</span>
                            </div>
                        )) : (
                            <div className="text-[9px] text-center text-gray-600 mt-4 italic">Nenhuma perícia treinada.</div>
                        )}
                     </div>
                </div>
            </div>
        </>
    );
};