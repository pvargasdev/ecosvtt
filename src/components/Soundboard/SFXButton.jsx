import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Volume2, Trash2, Edit2, Zap, Check, X } from 'lucide-react';
import * as Icons from 'lucide-react';

const SFXButton = ({ data }) => {
    const { triggerSfxRemote, updateSfx, removeSfx } = useGame();
    const [isPressed, setIsPressed] = useState(false);
    
    // Estados de UI
    const [mode, setMode] = useState('idle'); // 'idle', 'editing', 'deleting'
    const [editName, setEditName] = useState(data.name);
    const [editVolume, setEditVolume] = useState(data.volume || 1);

    // Listener para feedback visual remoto
    useEffect(() => {
        const handleRemoteTrigger = (e) => {
            if (e.detail && e.detail.id === data.id) animatePress();
        };
        window.addEventListener('ecos-sfx-trigger', handleRemoteTrigger);
        return () => window.removeEventListener('ecos-sfx-trigger', handleRemoteTrigger);
    }, [data.id]);

    const animatePress = () => {
        setIsPressed(true);
        setTimeout(() => setIsPressed(false), 200);
    };

    const handlePress = (e) => {
        if (mode !== 'idle') return; // Não toca se estiver editando
        if (e.button !== 0) return; // Apenas botão esquerdo
        animatePress();
        triggerSfxRemote(data);
    };

    const handleSaveEdit = (e) => {
        e.stopPropagation();
        updateSfx(data.id, { name: editName, volume: editVolume });
        setMode('idle');
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        removeSfx(data.id);
    };

    const IconComponent = Icons[data.icon] || Zap;

    // --- RENDERIZAÇÃO DO MODO DE EDIÇÃO ---
    if (mode === 'editing') {
        return (
            <div className="aspect-square rounded-xl border border-neon-green bg-black/90 flex flex-col p-2 gap-2 relative shadow-[0_0_15px_rgba(74,222,128,0.2)] animate-in fade-in zoom-in-95">
                <input 
                    className="w-full bg-white/10 border-none rounded px-1 py-0.5 text-xs text-center text-white outline-none focus:ring-1 focus:ring-neon-green"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    placeholder="Nome"
                />
                
                <div className="flex items-center gap-1 flex-1">
                    <Volume2 size={12} className="text-text-muted shrink-0"/>
                    <input 
                        type="range" min="0" max="150" 
                        value={editVolume * 100}
                        onChange={(e) => setEditVolume(e.target.value / 100)}
                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-neon-green [&::-webkit-slider-thumb]:rounded-full"
                    />
                </div>

                <div className="flex gap-2 mt-auto">
                    <button onClick={() => setMode('idle')} className="flex-1 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-text-muted hover:text-white flex justify-center"><X size={12}/></button>
                    <button onClick={handleSaveEdit} className="flex-1 py-1 bg-neon-green text-black font-bold rounded text-xs hover:bg-white flex justify-center"><Check size={12}/></button>
                </div>
            </div>
        );
    }

    // --- RENDERIZAÇÃO DO MODO DE CONFIRMAÇÃO DE EXCLUSÃO ---
    if (mode === 'deleting') {
        return (
            <div className="aspect-square rounded-xl border-2 border-red-500 bg-red-900/40 flex flex-col items-center justify-center p-2 relative animate-in zoom-in">
                <span className="text-xs font-bold text-white mb-2 text-center leading-tight">Excluir SFX?</span>
                <div className="flex gap-2 w-full">
                    <button onClick={(e) => { e.stopPropagation(); setMode('idle'); }} className="flex-1 py-1.5 bg-black/40 hover:bg-black/60 rounded text-white flex justify-center"><X size={14}/></button>
                    <button onClick={handleDelete} className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 rounded text-white flex justify-center shadow-lg"><Check size={14}/></button>
                </div>
            </div>
        );
    }

    // --- RENDERIZAÇÃO PADRÃO (PLAY) ---
    return (
        <div 
            className="relative group select-none h-full"
            onMouseDown={handlePress}
        >
            <div 
                className={`
                    w-full h-full rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-100 shadow-lg relative overflow-hidden
                    ${isPressed ? 'scale-95 brightness-150 border-white shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'hover:scale-105 hover:brightness-110'}
                `}
                style={{
                    backgroundColor: `${data.color}20`, 
                    borderColor: isPressed ? '#fff' : data.color,
                    boxShadow: isPressed ? `0 0 30px ${data.color}` : 'none'
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                
                <IconComponent 
                    size={32} 
                    style={{ color: data.color }} 
                    className={`z-10 mb-2 transition-transform duration-75 ${isPressed ? 'scale-125 text-white' : ''}`} 
                />
                
                <span className="z-10 text-[10px] font-bold uppercase tracking-wider text-white text-center px-1 truncate w-full shadow-black drop-shadow-md">
                    {data.name}
                </span>
            </div>

            {/* Ações de Hover (Só aparecem se não estiver pressionando) */}
            {!isPressed && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setEditName(data.name); setEditVolume(data.volume || 1); setMode('editing'); }} 
                        className="p-1.5 bg-black/60 backdrop-blur-sm rounded text-white hover:text-yellow-400 hover:bg-black/90 transition shadow-lg"
                        title="Editar"
                    >
                        <Edit2 size={10} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setMode('deleting'); }} 
                        className="p-1.5 bg-black/60 backdrop-blur-sm rounded text-white hover:text-red-500 hover:bg-black/90 transition shadow-lg"
                        title="Excluir"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SFXButton;