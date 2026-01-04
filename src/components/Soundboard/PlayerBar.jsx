import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Play, Pause, Volume2, VolumeX, Disc, Music } from 'lucide-react';

const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const PlayerBar = () => {
    const { soundboard, playTrack, setMusicVolume } = useGame();
    const { activeTrack } = soundboard;
    const [progress, setProgress] = useState(0);
    const [localVolume, setLocalVolume] = useState((soundboard.masterVolume.music || 0.5) * 100);
    const [isMuted, setIsMuted] = useState(false);

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
        setIsMuted(val === 0);
    };

    const toggleMute = () => {
        if (isMuted) {
            const vol = localVolume === 0 ? 50 : localVolume;
            
            setMusicVolume(vol / 100);
            setLocalVolume(vol); 
            setIsMuted(false);
        } else {
            setMusicVolume(0);
            setIsMuted(true);
        }
    };

    const togglePlayPause = () => {
        if (activeTrack.isPlaying) {
            playTrack({ ...activeTrack, isPlaying: false }, activeTrack.playlistId);
        } else {
            playTrack({ ...activeTrack, isPlaying: true }, activeTrack.playlistId);
        }
    };

    if (!activeTrack) return null;

    return (
        <div className="h-16 bg-[#080808]/95 border-t border-glass-border backdrop-blur-xl flex items-center justify-between px-4 shrink-0 relative overflow-hidden shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-50 w-full">
            
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pink-500/40 to-transparent"></div>

            <div className="flex items-center gap-3 overflow-hidden min-w-0 max-w-[60%]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shrink-0 ${activeTrack.isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    <Disc size={20} className={activeTrack.isPlaying ? "text-white" : "text-text-muted"} />
                </div>
                
                <div className="flex flex-col min-w-0">
                    <div className="text-sm font-bold text-white truncate font-rajdhani tracking-wide">
                        {activeTrack.title || "Selecionando..."}
                    </div>
                    <div className="text-[10px] text-pink-400 font-mono tracking-wider flex items-center gap-1 opacity-80">
                        <Music size={8} />
                        {formatTime(progress)} / {formatTime(activeTrack.duration)}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                
                <div className="flex items-center gap-2 group">
                    <button onClick={toggleMute} className="text-text-muted hover:text-white transition">
                        {isMuted || localVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    
                    <div className="w-24 h-1.5 bg-white/10 rounded-full relative overflow-hidden group-hover:bg-white/20 transition-colors">
                        <div 
                            className="absolute top-0 left-0 h-full bg-white group-hover:bg-pink-500 transition-colors"
                            style={{ width: `${isMuted ? 0 : localVolume}%` }}
                        />
                        <input 
                            type="range" min="0" max="100" 
                            value={isMuted ? 0 : localVolume} 
                            onChange={handleVolumeChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                </div>

                <div className="w-px h-8 bg-white/10"></div>

                <button 
                    onClick={togglePlayPause}
                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                        ${activeTrack.isPlaying 
                            ? 'bg-white text-black hover:bg-white hover:shadow-[0_0_15px_rgba(256,256,256,0.5)]' 
                            : 'bg-white text-black hover:bg-white hover:shadow-[0_0_15px_rgba(256,256,256,0.5)]'
                        }
                    `}
                    title={activeTrack.isPlaying ? "Pausar" : "Tocar"}
                >
                    {activeTrack.isPlaying ? (
                        <Pause size={20} fill="currentColor" />
                    ) : (
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default PlayerBar;