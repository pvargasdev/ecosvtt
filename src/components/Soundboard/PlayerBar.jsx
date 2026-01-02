import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { Play, Pause, Square, Volume2, SkipBack, SkipForward, Settings } from 'lucide-react';

const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const PlayerBar = () => {
    const { soundboard, stopTrack, playTrack, setMusicVolume } = useGame();
    const { activeTrack } = soundboard;
    const [progress, setProgress] = useState(0);
    const [localVolume, setLocalVolume] = useState(soundboard.masterVolume.music * 100);

    // Escuta o evento de progresso do AudioEngine (otimizado)
    useEffect(() => {
        const handleProgress = (e) => {
            setProgress(e.detail.progress);
        };
        window.addEventListener('ecos-audio-progress', handleProgress);
        return () => window.removeEventListener('ecos-audio-progress', handleProgress);
    }, []);

    // Atualiza volume localmente para UI responsiva e sincroniza com Contexto (debounce)
    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setLocalVolume(val);
        // Opcional: Adicionar debounce aqui se houver lag de rede
        setMusicVolume(val / 100);
    };

    if (!activeTrack) return null;

    return (
        <div className="h-20 bg-black/80 border-t border-glass-border flex items-center px-4 gap-4 shrink-0 backdrop-blur-md animate-in slide-in-from-bottom-2">
            
            {/* 1. INFO DA FAIXA */}
            <div className="w-1/4 min-w-[150px] overflow-hidden">
                <div className="text-sm font-bold text-neon-green truncate font-rajdhani">
                    {activeTrack.title || "Faixa Desconhecida"}
                </div>
                <div className="text-xs text-text-muted truncate">
                    {formatTime(progress)} / {formatTime(activeTrack.duration || 0)}
                </div>
            </div>

            {/* 2. CONTROLES CENTRAIS */}
            <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center gap-3">
                    <button className="text-text-muted hover:text-white transition" title="Anterior"><SkipBack size={16} /></button>
                    
                    {activeTrack.isPlaying ? (
                        <button 
                            onClick={() => playTrack({ ...activeTrack, isPlaying: false }, activeTrack.playlistId)}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition active:scale-95"
                        >
                            <Pause size={20} fill="black" />
                        </button>
                    ) : (
                        <button 
                            onClick={() => playTrack({ ...activeTrack, isPlaying: true }, activeTrack.playlistId)}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition active:scale-95"
                        >
                            <Play size={20} fill="black" className="ml-1" />
                        </button>
                    )}

                    <button onClick={stopTrack} className="text-text-muted hover:text-red-500 transition" title="Parar"><Square size={16} fill="currentColor"/></button>
                    <button className="text-text-muted hover:text-white transition" title="Próxima"><SkipForward size={16} /></button>
                </div>
                
                {/* Barra de Progresso Visual (Apenas visual por enquanto) */}
                <div className="w-full max-w-md h-1 bg-white/10 rounded-full overflow-hidden relative group cursor-pointer">
                    <div 
                        className="h-full bg-neon-green absolute top-0 left-0 transition-all duration-500 linear"
                        style={{ width: `${(progress / (activeTrack.duration || 1)) * 100}%` }}
                    />
                </div>
            </div>

            {/* 3. VOLUME */}
            <div className="w-1/4 min-w-[100px] flex items-center justify-end gap-2">
                <Volume2 size={16} className="text-text-muted" />
                <input 
                    type="range" min="0" max="100" 
                    value={localVolume} 
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
            </div>
        </div>
    );
};

export default PlayerBar;