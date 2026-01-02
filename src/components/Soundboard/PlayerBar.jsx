import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Play, Pause, Square, Volume2, Music, Disc } from 'lucide-react';

const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const PlayerBar = () => {
    const { soundboard, stopTrack, playTrack, setMusicVolume } = useGame();
    const { activeTrack } = soundboard;
    const [progress, setProgress] = useState(0);
    const [localVolume, setLocalVolume] = useState((soundboard.masterVolume.music || 0.5) * 100);

    // Listener de progresso otimizado
    useEffect(() => {
        const handleProgress = (e) => {
            setProgress(e.detail.progress);
        };
        window.addEventListener('ecos-audio-progress', handleProgress);
        return () => window.removeEventListener('ecos-audio-progress', handleProgress);
    }, []);

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setLocalVolume(val);
        setMusicVolume(val / 100);
    };

    if (!activeTrack) return null;

    return (
        <div className="h-[70px] bg-[#050505]/95 border-t border-glass-border backdrop-blur-xl flex items-center px-4 gap-3 shrink-0 relative overflow-hidden shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-50 w-full">
            
            {/* Brilho de fundo sutil */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-green/30 to-transparent"></div>

            {/* 1. INFO DA FAIXA (Esquerda) */}
            <div className="flex-1 flex items-center gap-3 overflow-hidden min-w-0">
                {/* Ícone de Disco Girando */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shrink-0 ${activeTrack.isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    <Disc size={20} className={activeTrack.isPlaying ? "text-neon-green" : "text-text-muted"} />
                </div>
                
                <div className="flex flex-col min-w-0 overflow-hidden">
                    <div className="text-sm font-bold text-white truncate font-rajdhani tracking-wide">
                        {activeTrack.title || "Faixa Desconhecida"}
                    </div>
                    {/* Tempo Numérico: Atual / Total */}
                    <div className="text-[10px] text-neon-green font-mono tracking-wider flex items-center gap-1">
                        <Music size={8} />
                        {formatTime(progress)} / {formatTime(activeTrack.duration)}
                    </div>
                </div>
            </div>

            {/* 2. CONTROLES (Direita) */}
            <div className="flex items-center gap-3 shrink-0">
                
                {/* Botão Play/Pause Principal */}
                {activeTrack.isPlaying ? (
                    <button 
                        onClick={() => playTrack({ ...activeTrack, isPlaying: false }, activeTrack.playlistId)}
                        className="w-9 h-9 rounded-full bg-neon-green text-black flex items-center justify-center hover:scale-110 transition active:scale-95 shadow-[0_0_10px_rgba(74,222,128,0.4)]"
                        title="Pausar"
                    >
                        <Pause size={18} fill="black" />
                    </button>
                ) : (
                    <button 
                        onClick={() => playTrack({ ...activeTrack, isPlaying: true }, activeTrack.playlistId)}
                        className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition active:scale-95 hover:bg-neon-green hover:shadow-[0_0_10px_rgba(74,222,128,0.4)]"
                        title="Tocar"
                    >
                        <Play size={18} fill="black" className="ml-0.5" />
                    </button>
                )}

                {/* Botão Stop (Menor) */}
                <button 
                    onClick={stopTrack} 
                    className="p-2 text-text-muted hover:text-red-500 transition hover:bg-white/5 rounded-full" 
                    title="Parar Totalmente"
                >
                    <Square size={14} fill="currentColor"/>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                {/* Volume Compacto */}
                <div className="group relative flex items-center justify-center w-8 h-8">
                    <Volume2 size={16} className={`text-text-muted transition-colors ${localVolume > 0 ? 'text-white' : ''}`} />
                    
                    {/* Slider de Volume (Aparece no Hover) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-8 h-24 bg-black/90 border border-white/10 rounded-lg hidden group-hover:flex items-center justify-center p-2 shadow-xl animate-in fade-in zoom-in-95">
                        <div className="relative w-1.5 h-full bg-white/10 rounded-full">
                            <div 
                                className="absolute bottom-0 left-0 w-full bg-neon-green rounded-full"
                                style={{ height: `${localVolume}%` }}
                            />
                            <input 
                                type="range" min="0" max="100" 
                                value={localVolume} 
                                onChange={handleVolumeChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none [writing-mode:vertical-lr]"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }} // Hack para slider vertical
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerBar;