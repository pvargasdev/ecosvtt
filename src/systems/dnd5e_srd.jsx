// src/systems/dnd5e_srd.jsx
import React from 'react';
import { Shield, Zap, Eye, Skull, User } from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL ---
const THEME_COLOR = "text-amber-400";
const THEME_BORDER = "border-amber-400";
const THEME_GLOW = "shadow-[0_0_15px_rgba(251,191,36,0.4)]";
const THEME_BG_BTN = "bg-amber-400/20 hover:bg-amber-400 hover:text-black";

// --- DADOS DO SISTEMA (PT-BR) ---
const ATTR_LABELS = {
    str: 'FOR', dex: 'DES', con: 'CON', 
    int: 'INT', wis: 'SAB', cha: 'CAR'
};

const SKILLS_MAP = [
    { id: 'acrobacia', label: 'Acrobacia', attr: 'dex' },
    { id: 'adestrar', label: 'Lidar c/ Animais', attr: 'wis' },
    { id: 'arcanismo', label: 'Arcanismo', attr: 'int' },
    { id: 'atletismo', label: 'Atletismo', attr: 'str' },
    { id: 'atuacao', label: 'Atuação', attr: 'cha' },
    { id: 'enganacao', label: 'Enganação', attr: 'cha' },
    { id: 'furtividade', label: 'Furtividade', attr: 'dex' },
    { id: 'historia', label: 'História', attr: 'int' },
    { id: 'intimidacao', label: 'Intimidação', attr: 'cha' },
    { id: 'intuicao', label: 'Intuição', attr: 'wis' },
    { id: 'investigacao', label: 'Investigação', attr: 'int' },
    { id: 'medicina', label: 'Medicina', attr: 'wis' },
    { id: 'natureza', label: 'Natureza', attr: 'int' },
    { id: 'percepcao', label: 'Percepção', attr: 'wis' },
    { id: 'persuasao', label: 'Persuasão', attr: 'cha' },
    { id: 'prestidigitacao', label: 'Prestidigitação', attr: 'dex' },
    { id: 'religiao', label: 'Religião', attr: 'int' },
    { id: 'sobrevivencia', label: 'Sobrevivência', attr: 'wis' },
];

// Utilitários
const handleNumber = (value) => {
    const clean = value.replace(/\D/g, '').slice(0, 3);
    return clean === '' ? 0 : parseInt(clean);
};

const calcMod = (score) => Math.floor((score - 10) / 2);
const formatMod = (val) => (val >= 0 ? `+${val}` : val);

// 1. METADADOS E ESTADO PADRÃO
export const SYSTEM_ID = 'dnd5e_srd';
export const SYSTEM_NAME = 'D&D 5e';
export const SYSTEM_DESC = '5e em Português.';

export const defaultState = {
    classLevel: "Guerreiro lvl. 1",
    race: "Humano",
    hp: 10,
    hpMax: 10,
    ac: 16, 
    speed: 9, 
    prof: 2,
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
    skills: { atletismo: true }, 
    attacks: "Espada Longa: +5 (1d8+3)\nArco Longo: +3 (1d8+1)",
    notes: "", 
    deathSaves: { success: [false, false, false], failure: [false, false, false] }
};

// 2. COMPONENTE DE EDIÇÃO
export const Editor = ({ data, updateData }) => {
    const handleFocus = (e) => e.target.select();
    const ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    const toggleSkillProf = (skillId) => {
        const current = data.skills || {};
        updateData({ skills: { ...current, [skillId]: !current[skillId] } });
    };

    return (
        <div className="space-y-3 h-full overflow-y-auto pr-1">
            {/* Classe, Raça e Prof */}
            <div className="flex gap-2">
                <div className="flex-[2]">
                    <label className="text-xs text-text-muted mb-0.5 block">Classe e Nível</label>
                    <input className="w-full bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-amber-400 transition-colors"
                           value={data.classLevel || ''} 
                           onChange={e=>updateData({ classLevel: e.target.value })}/>
                </div>
                 <div className="flex-[2]">
                    <label className="text-xs text-text-muted mb-0.5 block">Raça</label>
                    <input className="w-full bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-amber-400 transition-colors"
                           value={data.race || ''} 
                           onChange={e=>updateData({ race: e.target.value })}/>
                </div>
                <div className="w-16">
                    <label className="text-xs text-text-muted mb-0.5 block">Prof.</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-center outline-none focus:border-amber-400"
                        value={data.prof || 2} onChange={e => updateData({ prof: handleNumber(e.target.value) })}/>
                </div>
            </div>

            {/* Status Básicos */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="text-[9px] text-text-muted block text-center uppercase">PV Máx</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-amber-400"
                        value={data.hpMax || 0} onChange={e => updateData({ hpMax: handleNumber(e.target.value) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-text-muted block text-center uppercase">CA (Armadura)</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-amber-400"
                        value={data.ac || 10} onChange={e => updateData({ ac: handleNumber(e.target.value) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-text-muted block text-center uppercase">Desloc. (m)</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-amber-400"
                        value={data.speed || 9} onChange={e => updateData({ speed: handleNumber(e.target.value) })}/>
                </div>
            </div>
            
            {/* Atributos */}
            <div>
                <label className="text-xs text-text-muted mb-0.5 block">Atributos (Valor Base)</label>
                <div className="bg-black/20 p-2 rounded border border-glass-border grid grid-cols-6 gap-1">
                    {ATTR_KEYS.map(key => (
                        <div key={key}>
                            <label className="text-[9px] text-text-muted block text-center font-bold">{ATTR_LABELS[key]}</label>
                            <input type="text" onFocus={handleFocus}
                                className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center font-bold outline-none focus:border-amber-400"
                                value={data.attributes?.[key] || 10} 
                                onChange={e => updateData({ attributes: { ...data.attributes, [key]: handleNumber(e.target.value) } })}/>
                        </div>
                    ))}
                </div>
            </div>

            {/* Perícias */}
            <div>
                <label className="text-xs text-text-muted mb-0.5 block">Proficiências</label>
                <div className="bg-black/20 p-2 rounded border border-glass-border grid grid-cols-2 gap-x-2 gap-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                    {SKILLS_MAP.map(skill => (
                        <label key={skill.id} className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer hover:text-white">
                            <input type="checkbox" checked={!!data.skills?.[skill.id]}
                                onChange={() => toggleSkillProf(skill.id)}
                                className="accent-amber-500"/>
                            <span>{skill.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Ataques */}
            <div>
                <label className="text-xs text-text-muted mb-0.5 block">Ataques e Notas</label>
                <textarea className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-amber-400 h-20 resize-none scrollbar-thin"
                    value={data.attacks || ''} onChange={e=>updateData({ attacks:e.target.value })}/>
            </div>
        </div>
    );
};

// 3. COMPONENTE DE VISUALIZAÇÃO
export const Viewer = ({ data, updateData }) => {
    const ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    const toggleDeathSave = (type, index) => {
        const arr = [...data.deathSaves[type]];
        arr[index] = !arr[index];
        updateData({ deathSaves: { ...data.deathSaves, [type]: arr }});
    };

    const getSkillTotal = (skill) => {
        const attrVal = data.attributes?.[skill.attr] || 10;
        let mod = calcMod(attrVal);
        if (data.skills?.[skill.id]) mod += (data.prof || 2);
        return formatMod(mod);
    };

    return (
        <>
            {/* 0. IDENTIDADE (Classe, Nível e Raça) - NOVO */}
            <div className="items-center justify-center mb-2 -mt-1">
                <div className="items-center justify-center bg-white/5 border border-white/40 rounded-full px-4 py-1 flex items-center gap-2 shadow-sm backdrop-blur-sm">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{data.race || 'Raça'}</span>
                    <span className="text-gray-600 text-[8px]">•</span>
                    <span className={`text-xs font-bold ${THEME_COLOR} font-rajdhani uppercase tracking-widest`}>
                        {data.classLevel || 'Classe ?'}
                    </span>
                </div>
            </div>

            {/* 1. HEADER: PV + STATUS */}
            <div className="flex gap-2 mb-4 h-[70px]">
                {/* Controle de PV (Editável) */}
                <div className={`flex-1 flex items-center justify-between bg-amber-900/10 border ${THEME_BORDER} rounded-xl p-1 ${THEME_GLOW}`}>
                    <button onClick={() => updateData({ hp: Math.max(0, data.hp - 1) })} 
                        className={`w-8 h-full flex items-center justify-center text-lg rounded transition-all ${THEME_BG_BTN}`}>-</button>
                    
                    <div className="flex flex-col items-center justify-center leading-none flex-1">
                        <input 
                            type="text"
                            maxLength={3}
                            value={data.hp}
                            onChange={(e) => updateData({ hp: handleNumber(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            className="w-16 bg-transparent text-3xl font-rajdhani font-bold text-white text-center outline-none drop-shadow-[0_0_5px_rgba(251,191,36,0.6)] focus:text-amber-200"
                        />
                        <span className={`text-[10px] ${THEME_COLOR} font-bold tracking-widest uppercase mt-1 pointer-events-none`}>PV ATUAL / {data.hpMax}</span>
                    </div>

                    <button onClick={() => updateData({ hp: Math.min(data.hpMax, data.hp + 1) })} 
                        className={`w-8 h-full flex items-center justify-center text-lg rounded transition-all ${THEME_BG_BTN}`}>+</button>
                </div>

                {/* Coluna Lateral: CA, Deslocamento, Prof */}
                <div className="flex flex-col gap-1 w-[85px]">
                    {/* CA */}
                    <div className="flex-1 bg-glass border border-glass-border rounded-lg flex items-center justify-center gap-2 relative" title="Classe de Armadura">
                        <Shield size={14} className={THEME_COLOR} />
                        <span className="font-bold text-white text-xl">{data.ac}</span>
                    </div>
                    
                    {/* Deslocamento e Prof */}
                    <div className="flex gap-1 h-[30px]">
                        <div className="flex-1 bg-glass border border-glass-border rounded-lg flex items-center justify-center gap-1" title="Deslocamento">
                             <span className="text-xs font-bold text-white">{data.speed}m</span>
                        </div>
                        <div className="flex-1 bg-glass border border-glass-border rounded-lg flex items-center justify-center flex-col leading-none" title="Bônus de Proficiência">
                             <span className="text-[8px] text-gray-500">PROF</span>
                             <span className="text-xs font-bold text-white">+{data.prof}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. ATRIBUTOS */}
            <div className="bg-glass border border-glass-border rounded-xl p-2 mb-4">
                <div className="grid grid-cols-6 gap-1">
                    {ATTR_KEYS.map(key => {
                        const score = data.attributes?.[key] || 10;
                        return (
                            <div key={key} className="flex flex-col items-center">
                                <span className="text-[9px] text-gray-500 font-bold mb-0.5">{ATTR_LABELS[key]}</span>
                                <div className="bg-black/40 w-full aspect-square rounded border border-white/10 flex flex-col items-center justify-center">
                                    <span className={`text-sm font-bold ${THEME_COLOR}`}>
                                        {formatMod(calcMod(score))}
                                    </span>
                                    <span className="text-[8px] text-gray-600">{score}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 3. CONTEÚDO PRINCIPAL (Ataques e Perícias) */}
            <div className="flex gap-3 mb-4 min-h-[180px]">
                {/* Ataques */}
                <div className="flex-[4] bg-glass border border-glass-border rounded-xl p-3 flex flex-col overflow-hidden">
                    <span className={`text-xs uppercase ${THEME_COLOR} font-bold tracking-wider mb-2 block border-b border-glass-border pb-2 shrink-0 flex items-center gap-2`}>
                        <Zap size={12}/> Ataques & Notas
                    </span>
                    <div className="text-xs text-gray-300 whitespace-pre-line overflow-y-auto flex-1 max-h-[9rem] scrollbar-thin pr-1 font-mono">
                        {data.attacks || '-'}
                    </div>
                </div>

                {/* Perícias */}
                <div className="flex-[3] bg-glass border border-glass-border rounded-xl p-0 flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-glass-border bg-white/5">
                        <span className={`text-xs uppercase text-white font-bold tracking-wider flex items-center gap-2`}>
                            <Eye size={12}/> Perícias
                        </span>
                    </div>
                    <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-600 p-1">
                        {SKILLS_MAP.map(skill => {
                            const isProf = !!data.skills?.[skill.id];
                            return (
                                <div key={skill.id} className={`flex justify-between items-center px-2 py-1 mb-1 rounded text-xs ${isProf ? 'bg-amber-400/10 border border-amber-400/30' : 'text-gray-500'}`}>
                                    <span className={isProf ? 'text-amber-100 font-medium' : ''}>{skill.label}</span>
                                    <span className={`font-mono font-bold ${isProf ? THEME_COLOR : 'text-gray-600'}`}>
                                        {getSkillTotal(skill)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 4. DEATH SAVES */}
            <div className="bg-glass border border-glass-border rounded-xl p-2 px-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skull size={12} className="text-gray-500"/>
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Morte</span>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-1" title="Sucessos">
                        {[0,1,2].map(i => (
                            <button key={`s${i}`} onClick={() => toggleDeathSave('success', i)}
                                className={`w-3 h-3 rounded-full border border-green-900 ${data.deathSaves.success[i] ? 'bg-green-500' : 'bg-black/50'}`} />
                        ))}
                    </div>
                    <div className="flex items-center gap-1" title="Falhas">
                        {[0,1,2].map(i => (
                            <button key={`f${i}`} onClick={() => toggleDeathSave('failure', i)}
                                className={`w-3 h-3 rounded-full border border-red-900 ${data.deathSaves.failure[i] ? 'bg-red-500' : 'bg-black/50'}`} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};