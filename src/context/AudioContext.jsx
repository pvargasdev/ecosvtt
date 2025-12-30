import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { imageDB } from './db';

const AudioContext = createContext({});

export const AudioProvider = ({ children }) => {
    // --- ESTADOS DE CONFIGURAÇÃO ---
    const [musicVolume, setMusicVolume] = useState(0.5);
    const [sfxVolume, setSfxVolume] = useState(0.7);
    const [crossfadeDuration, setCrossfadeDuration] = useState(3000); // Padrão 3s

    // --- ESTADOS DE REPRODUÇÃO (UI) ---
    const [currentMusicId, setCurrentMusicId] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // [NOVO] Estados de Progresso
    const [trackDuration, setTrackDuration] = useState(0); // em segundos
    const [currentTime, setCurrentTime] = useState(0);     // em segundos

    // --- REFS ---
    const activeMusicRef = useRef(null);
    const activeSfxRef = useRef({});
    const progressIntervalRef = useRef(null); // [NOVO] Loop de atualização da barra

    // --- MÚSICA (SOUNDTRACK) ---

    // [NOVO] Função para iniciar o rastreamento do tempo
    const startProgressLoop = useCallback(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        
        progressIntervalRef.current = setInterval(() => {
            if (activeMusicRef.current && activeMusicRef.current.playing()) {
                const seek = activeMusicRef.current.seek();
                setCurrentTime(typeof seek === 'number' ? seek : 0);
            }
        }, 500); // Atualiza a cada 0.5s (reduz carga no React)
    }, []);

    const stopProgressLoop = useCallback(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }, []);

    const playMusic = useCallback(async (audioId, forceRestart = false) => {
        if (!audioId) return;

        // Resume se for a mesma música
        if (currentMusicId === audioId && !forceRestart) {
            if (activeMusicRef.current && !activeMusicRef.current.playing()) {
                activeMusicRef.current.play();
                activeMusicRef.current.fade(0, musicVolume, 500); 
                setIsPlaying(true);
                startProgressLoop(); // [NOVO] Retoma o loop
            }
            return;
        }

        setIsLoading(true);
        stopProgressLoop(); // [NOVO] Para loop anterior
        setCurrentTime(0);
        setTrackDuration(0);

        try {
            const blob = await imageDB.getAudio(audioId);
            if (!blob) throw new Error("Áudio não encontrado.");
            const url = URL.createObjectURL(blob);

            // Crossfade
            if (activeMusicRef.current && activeMusicRef.current.playing()) {
                const oldHowl = activeMusicRef.current;
                oldHowl.fade(oldHowl.volume(), 0, crossfadeDuration);
                oldHowl.once('fade', () => { oldHowl.stop(); oldHowl.unload(); });
            }

            const newHowl = new Howl({
                src: [url],
                html5: true, 
                loop: true,
                volume: 0,
                onplay: () => {
                    setIsPlaying(true);
                    setTrackDuration(newHowl.duration()); // [NOVO] Pega duração total
                    startProgressLoop(); // [NOVO] Inicia loop
                },
                onend: () => { /* Loop nativo cuida disso */ },
                onload: () => {
                   setTrackDuration(newHowl.duration()); // [NOVO] Garante duração no load
                },
                onstop: () => {
                    stopProgressLoop();
                    setIsPlaying(false);
                }
            });

            newHowl.play();
            newHowl.fade(0, musicVolume, crossfadeDuration);
            
            activeMusicRef.current = newHowl;
            setCurrentMusicId(audioId);

        } catch (error) {
            console.error("Erro ao tocar:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentMusicId, musicVolume, crossfadeDuration, startProgressLoop, stopProgressLoop]);

    const pauseMusic = useCallback(() => {
        if (activeMusicRef.current && activeMusicRef.current.playing()) {
            activeMusicRef.current.fade(activeMusicRef.current.volume(), 0, 500);
            setTimeout(() => { if(activeMusicRef.current) activeMusicRef.current.pause(); }, 500);
            setIsPlaying(false);
            stopProgressLoop(); // [NOVO]
        }
    }, [stopProgressLoop]);

    const stopMusic = useCallback(() => {
        if (activeMusicRef.current) {
            activeMusicRef.current.stop();
            activeMusicRef.current.unload();
            activeMusicRef.current = null;
        }
        setCurrentMusicId(null);
        setIsPlaying(false);
        stopProgressLoop(); // [NOVO]
        setCurrentTime(0);
        setTrackDuration(0);
    }, [stopProgressLoop]);

    // [NOVO] Função de Seek (Pular para tempo)
    const seekMusic = useCallback((seconds) => {
        if (activeMusicRef.current) {
            activeMusicRef.current.seek(seconds);
            setCurrentTime(seconds);
        }
    }, []);

    // --- SFX (Mantido igual) ---
    const playSFX = useCallback(async (audioId, options = {}) => {
        if (!audioId) return;
        try {
            const blob = await imageDB.getAudio(audioId);
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const specificVolume = options.volume !== undefined ? options.volume : 1.0;
            
            const sfx = new Howl({
                src: [url],
                loop: options.loop || false,
                volume: sfxVolume * specificVolume,
                onend: function() { if (!options.loop) { this.unload(); } }
            });
            const sfxInstanceId = crypto.randomUUID();
            activeSfxRef.current[sfxInstanceId] = sfx;
            sfx.play();
            sfx.on('unload', () => { delete activeSfxRef.current[sfxInstanceId]; });
        } catch (e) { console.error("Erro SFX:", e); }
    }, [sfxVolume]);

    const stopAllSFX = useCallback(() => {
        Object.values(activeSfxRef.current).forEach(howl => { howl.stop(); howl.unload(); });
        activeSfxRef.current = {};
    }, []);

    const stopAll = useCallback(() => { stopMusic(); stopAllSFX(); }, [stopMusic, stopAllSFX]);

    useEffect(() => { if (activeMusicRef.current) activeMusicRef.current.volume(musicVolume); }, [musicVolume]);
    useEffect(() => { Object.values(activeSfxRef.current).forEach(howl => howl.volume(sfxVolume)); }, [sfxVolume]);

    const value = {
        currentMusicId, isPlaying, isLoading,
        musicVolume, setMusicVolume,
        sfxVolume, setSfxVolume,
        crossfadeDuration, setCrossfadeDuration,
        // [NOVO] Exports de Tempo
        trackDuration, currentTime, seekMusic,
        playMusic, pauseMusic, stopMusic, playSFX, stopAllSFX, stopAll
    };

    return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = () => useContext(AudioContext);