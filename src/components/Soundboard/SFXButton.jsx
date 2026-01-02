import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Volume2, Trash2, Edit2, Zap, Check, X, StopCircle } from 'lucide-react';
import * as Icons from 'lucide-react';

const SFXButton = ({ data }) => {
    const { triggerSfxRemote, updateSfx, removeSfx } = useGame();
    
    // Estados
    const [isPlaying, setIsPlaying] = useState(false);
    const [mode, setMode] = useState('idle'); // 'idle', 'editing', 'deleting'
    const [editName, setEditName] = useState(data.name);
    const [editVolume, setEditVolume] = useState(data.volume || 1);

    // Listener para saber se ESTE som está tocando (iniciado por qualquer pessoa)
    useEffect(() => {
        const onStart = () => setIsPlaying(true);
        const onEnd = () => setIsPlaying(false);

        // O Engine emitirá esses eventos
        window.addEventListener(`ecos-sfx-start-${data.id}`, onStart);
        window.addEventListener(`ecos-sfx-end-${data.id}`, onEnd);

        return () => {
            window.removeEventListener(`ecos-sfx-start-${data.id}`, onStart);
            window.removeEventListener(`ecos-sfx-end-${data.id}`, onEnd);
        };
    }, [data.id]);

    const handlePress = (e) => {
        if (mode !== 'idle') return; 
        if (e.button !== 0) return; 
        
        // Dispara o comando. O Engine decidirá se Toca ou Para.
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

    // --- MODO EDIÇÃO ---
    if (mode === 'editing') {
        return (
            // [CORREÇÃO] Ajustada a shadow para rosa (rgba: 244, 114, 182) para combinar com border-pink-400
            <div className="aspect-square rounded-xl border border-pink-400 bg-black/90 flex flex-col p-2 gap-2 relative shadow-[0_0_15px_rgba(244,114,182,0.2)] animate-in fade-in cursor-default" onMouseDown={e => e.stopPropagation()}>
                <input 
                    className="w-full bg-white/10 border-none rounded px-1 py-0.5 text-xs text-center text-white outline-none focus:ring-1 focus:ring-pink-400"
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
                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-pink-400 [&::-webkit-slider-thumb]:rounded-full"
                    />
                </div>
                <div className="flex gap-2 mt-auto">
                    <button onMouseDown={() => setMode('idle')} className="flex-1 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-text-muted hover:text-white flex justify-center"><X size={12}/></button>
                    <button onMouseDown={handleSaveEdit} className="flex-1 py-1 bg-pink-400 text-black font-bold rounded text-xs hover:bg-white flex justify-center"><Check size={12}/></button>
                </div>
            </div>
        );
    }

    // --- MODO CONFIRMAÇÃO ---
    if (mode === 'deleting') {
        return (
            <div className="aspect-square rounded-xl border-2 border-red-500 bg-red-900/40 flex flex-col items-center justify-center p-2 relative animate-in fade-in cursor-default" onMouseDown={e => e.stopPropagation()}>
                <span className="text-xs font-bold text-white mb-2 text-center leading-tight">Excluir SFX?</span>
                <div className="flex gap-2 w-full">
                    <button onMouseDown={() => setMode('idle')} className="flex-1 py-1.5 bg-black/40 hover:bg-black/60 rounded text-white flex justify-center"><X size={14}/></button>
                    <button onMouseDown={handleDelete} className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 rounded text-white flex justify-center shadow-lg"><Check size={14}/></button>
                </div>
            </div>
        );
    }

    // --- MODO NORMAL (Botão) ---
    return (
        <div 
            className="relative group select-none h-full"
            onMouseDown={handlePress}
        >
            <div 
                className={`
                    w-full h-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 relative overflow-hidden
                    ${isPlaying 
                        ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.4)]' // Estilo ATIVO (Tocando) - Pink vibrante
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10' // Estilo Inativo
                    }
                `}
                // [CORREÇÃO] Removidos estilos inline que forçavam data.color (roxo)
            >
                {/* Indicador de "Parar" ao passar o mouse enquanto toca */}
                {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    </div>
                )}

                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none ${isPlaying ? 'opacity-80' : 'opacity-100'}`} />
                
                {/* [CORREÇÃO] Ícone agora é sempre Pink fixo, ignorando data.color */}
                <IconComponent 
                    size={32} 
                    className={`z-10 mb-2 transition-transform duration-200 text-pink-500 ${isPlaying ? 'scale-110 animate-pulse text-pink-400' : ''}`} 
                />
                
                <span className={`z-10 text-[10px] font-bold uppercase tracking-wider text-center px-1 truncate w-full shadow-black drop-shadow-md ${isPlaying ? 'text-pink-400' : 'text-white'}`}>
                    {isPlaying ? 'TOCANDO...' : data.name}
                </span>
            </div>

            {/* Ações de Hover */}
            {!isPlaying && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                        onMouseDown={(e) => { e.stopPropagation(); setEditName(data.name); setEditVolume(data.volume || 1); setMode('editing'); }} 
                        className="p-1.5 bg-black/60 backdrop-blur-sm rounded text-white hover:text-pink-400 hover:bg-black/90 transition shadow-lg"
                        title="Editar"
                    >
                        <Edit2 size={10} />
                    </button>
                    <button 
                        onMouseDown={(e) => { e.stopPropagation(); setMode('deleting'); }} 
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