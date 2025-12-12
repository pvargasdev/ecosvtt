// src/systems/ecos_rpg.jsx
import React from 'react';
import { Upload } from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL (Copiado do original) ---
const THEME_PURPLE = "text-[#d084ff]";
const THEME_GLOW = "shadow-[0_0_15px_rgba(208,132,255,0.4)]";

// Utilitário interno
const resizeDamageArray = (currentArray, newSize) => {
    const arr = [...(currentArray || [])];
    while(arr.length < newSize) arr.push(false);
    while(arr.length > newSize) arr.pop();
    return arr;
};

const handleSingleDigit = (value) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    return clean === '' ? 0 : parseInt(clean);
};

// 1. METADADOS E ESTADO PADRÃO
export const SYSTEM_ID = 'ecos_rpg_v1';
export const SYSTEM_NAME = 'ECOS RPG (Padrão)';

export const defaultState = {
    // Nota: Name e Photo são gerenciados pelo Core, mas o restante vem daqui
    karma: 0,
    karmaMax: 3,
    attributes: { mente: 0, corpo: 0, destreza: 0, presenca: 0 },
    skills: "",
    traumas: "",
    damage: { superior: [false], medium: [false, false], inferior: [false, false] }
};

// 2. COMPONENTE DE EDIÇÃO (Formulário)
export const Editor = ({ data, updateData }) => {
    const handleFocus = (e) => e.target.select();

    return (
        <div className="space-y-3">
            {/* Karma Máximo e Descrição */}
            <div className="flex gap-2">
                <div className="w-20">
                    <label className="text-xs text-text-muted mb-0.5 block">Karma Máx.</label>
                    <input type="text"
                           maxLength={1}
                           onFocus={handleFocus}
                           className={`w-full bg-black/50 border border-glass-border rounded p-2 text-white text-center outline-none focus:border-white transition-colors`} 
                           value={data.karmaMax||0} 
                           onChange={e=>updateData({ karmaMax: handleSingleDigit(e.target.value) })}/>
                </div>
                <div className="flex-1">
                    <label className="text-xs text-text-muted mb-0.5 block">Descrição</label>
                    <input className={`w-full bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-white transition-colors`}
                           maxLength={100}
                           value={data.description||''} 
                           onChange={e=>updateData({ description:e.target.value })}/>
                </div>
            </div>
            
            {/* Atributos */}
            <div>
                <label className="text-xs text-text-muted mb-0.5 block">Atributos</label>
                <div className="bg-black/20 p-2 rounded border border-glass-border">
                    <div className="grid grid-cols-4 gap-2">
                        {['Mente','Corpo','Destreza','Presenca'].map(a=>(
                            <div key={a}>
                                <label className="text-[9px] text-text-muted block text-center uppercase">{a.substr(0,3)}</label>
                                <input type="text"
                                    maxLength={1}
                                    onFocus={handleFocus}
                                    className={`w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center font-bold outline-none focus:border-white transition-colors`}
                                    value={data.attributes?.[a.toLowerCase()]||0} 
                                    onChange={e=>updateData({ attributes:{...data.attributes, [a.toLowerCase()]: handleSingleDigit(e.target.value)} })}/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Perícias */}
            <div>
                <label className="text-xs text-text-muted mb-0.5 block">Perícias</label>
                <textarea 
                    className={`w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-white transition-colors resize-none h-32 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent`}
                    value={data.skills||''} 
                    placeholder="Liste as perícias..."
                    onChange={e=>updateData({ skills:e.target.value })}/>
            </div>

            {/* Traumas */}
            <div>
                <label className="text-xs text-text-muted mb-0.5 block">Traumas</label>
                <textarea 
                    className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-white transition-colors resize-none h-32 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent" 
                    value={data.traumas||''} 
                    placeholder="Liste os traumas..."
                    onChange={e=>updateData({ traumas:e.target.value })}/>
            </div>
            
            {/* Tolerância a Dano */}
            <div>
                <label className="text-xs text-text-muted mb-0.5 block">Tolerância a Dano</label>
                <div className="bg-red-900/10 p-2 rounded border border-red-900/30">
                    <div className="flex gap-2">
                        {[['superior','Grave'],['medium','Moderado'],['inferior','Leve']].map(([k,l])=>(
                            <div key={k} className="flex-1">
                                <label className="text-[9px] text-text-muted block text-center uppercase">{l}</label>
                                <input type="text"
                                    maxLength={1}
                                    onFocus={handleFocus}
                                    className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-white transition-colors" 
                                    value={data.damage?.[k]?.length||0} 
                                    onChange={e=>{
                                        const s = handleSingleDigit(e.target.value); 
                                        updateData({ damage:{...data.damage, [k]:resizeDamageArray(data.damage[k], s)} });
                                    }}/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 3. COMPONENTE DE VISUALIZAÇÃO (Ficha Interativa)
export const Viewer = ({ data, updateData }) => {
    return (
        <>
            {/* Controle de Karma */}
            <div className={`flex items-center justify-between bg-[#d084ff]/15 border border-[#d084ff] rounded-xl p-2 h-[60px] w-full ${THEME_GLOW} mb-4`}>
                <button 
                    onClick={() => updateData({ karma: Math.max(0, data.karma - 1) })} 
                    className="w-10 h-full flex items-center justify-center text-xl bg-[#d084ff]/20 rounded hover:bg-[#d084ff] hover:text-black hover:shadow-[0_0_10px_#d084ff] transition-all shrink-0"
                >
                    -
                </button>
                <div className="flex flex-col items-center min-w-[3rem]">
                    <span className={`text-[10px] ${THEME_PURPLE} font-bold tracking-widest uppercase`}>KARMA</span>
                    <span className="text-3xl font-rajdhani font-bold text-white drop-shadow-[0_0_10px_#d084ff] leading-none">{data.karma}</span>
                </div>
                <button 
                    onClick={() => updateData({ karma: Math.min(data.karmaMax, data.karma + 1) })} 
                    className="w-10 h-full flex items-center justify-center text-xl bg-[#d084ff]/20 rounded hover:bg-[#d084ff] hover:text-black hover:shadow-[0_0_10px_#d084ff] transition-all shrink-0"
                >
                    +
                </button>
            </div>

            {/* Descrição */}
            <div className="bg-glass border border-glass-border rounded-xl p-1.5 mb-4 min-h-[30px] flex items-center relative overflow-hidden">
                    <span className="text-lg font-rajdhani font-semibold text-text-main line-clamp-2 text-center text-ellipsis w-full leading-tight">
                    {data.description || '---'}
                    </span>
            </div>

            {/* Atributos e Perícias */}
            <div className="flex gap-4 mb-4 min-h-[160px]">
                <div className="flex-1 bg-glass border border-glass-border rounded-xl p-3 flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-3 h-full">
                        {['mente','corpo','destreza','presenca'].map(a=>(
                            <div key={a} className="bg-black/20 border border-white/5 rounded-lg flex flex-col items-center justify-center p-1 overflow-hidden">
                                <span className="font-rajdhani font-bold text-2xl text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.3)] leading-none">
                                    {data.attributes?.[a] || 0}
                                </span>
                                <span className="text-[10px] uppercase text-text-muted mt-1 tracking-wider truncate max-w-full">
                                    {a.substring(0,3)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 bg-glass border border-glass-border rounded-xl p-3 flex flex-col overflow-hidden">
                    <span className="text-xs uppercase text-neon-green font-bold tracking-wider mb-2 block border-b border-glass-border pb-2 shrink-0">Perícias</span>
                    <div className="text-sm text-gray-300 whitespace-pre-line overflow-y-auto flex-1 max-h-[6.5rem] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent pr-2">
                        {data.skills || '-'}
                    </div>
                </div>
            </div>
            
            {/* Dano e Traumas */}
            <div className="flex gap-4 mb-4 min-h-[160px]">
                <div className="flex-1 bg-glass border border-glass-border rounded-xl p-3 flex flex-col overflow-hidden">
                    <span className="text-xs uppercase text-neon-red font-bold tracking-wider mb-2 block border-b border-glass-border pb-2 shrink-0">Dano</span>
                    <div className="flex flex-col gap-2 h-full justify-between">
                        {['superior', 'medium', 'inferior'].map((k) => (
                            <div key={k} className="flex gap-2 flex-1 w-full">
                                {(data.damage?.[k] || []).map((f, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            const n = [...data.damage[k]];
                                            n[i] = !n[i];
                                            updateData({ damage: { ...data.damage, [k]: n } });
                                        }}
                                        className={`h-full flex-1 rounded border border-glass-border transition-all ${
                                            f ? 'bg-neon-red shadow-[0_0_10px_#ff2a2a] border-neon-red' : 'bg-black/30 hover:bg-white/10'
                                        }`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 bg-glass border border-glass-border rounded-xl p-3 flex flex-col overflow-hidden">
                    <span className="text-xs uppercase text-neon-red font-bold tracking-wider mb-2 block border-b border-glass-border pb-2 shrink-0">Traumas</span>
                    <div className="text-sm text-gray-300 whitespace-pre-line overflow-y-auto flex-1 max-h-[6.5rem] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent pr-2">
                        {data.traumas || '-'}
                    </div>
                </div>
            </div>
        </>
    );
};