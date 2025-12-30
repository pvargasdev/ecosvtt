import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { imageDB } from './db'; 

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children }) => {
    // --- DETECÇÃO DE PAPEL ---
    const isGM = typeof window !== 'undefined' && window.location.search.includes('mode=gm');
    const isHost = !isGM; 

    // --- ARQUITETURA ---
    const audioA = useRef(isHost ? new Audio() : null);
    const audioB = useRef(isHost ? new Audio() : null);
    const activeDeckRef = useRef('A'); 
    const fadeIntervalRef = useRef(null);
    
    // --- ESTADOS ---
    const [currentMusicId, setCurrentMusicId] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [trackDuration, setTrackDuration] = useState(0);

    // --- CONFIGS ---
    const [musicVolume, setMusicVolumeState] = useState(0.5);
    const [sfxVolume, setSfxVolumeState] = useState(0.5);
    const [crossfadeDuration, setCrossfadeDurationState] = useState(2000); 

    // Helper de IDs seguro (Evita bug de reset de música)
    const normalizeId = (id) => id ? String(id) : null;

    // =========================================================================
    // COMUNICAÇÃO (ELECTRON IPC)
    // =========================================================================

    const sendIPC = useCallback((channel, data) => {
        if (window.electron && window.electron.sendSync) {
            window.electron.sendSync(channel, data);
        }
    }, []);

    const broadcastState = useCallback((overrideState = {}) => {
        if (!isHost) return;
        const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
        
        sendIPC('AUDIO_STATE', {
            currentMusicId,
            isPlaying, 
            currentTime: activeAudio ? activeAudio.currentTime : 0, 
            duration: activeAudio ? (activeAudio.duration || 0) : 0,
            musicVolume,
            sfxVolume,
            crossfadeDuration,
            ...overrideState
        });
    }, [isHost, currentMusicId, isPlaying, musicVolume, sfxVolume, crossfadeDuration]);

    useEffect(() => {
        if (window.electron && window.electron.onSync) {
            window.electron.onSync((msg) => {
                if (!msg) return;
                // HOST: Recebe Comandos
                if (isHost) {
                    if (msg.type === 'AUDIO_CMD') handleRemoteCommand(msg.data);
                    if (msg.type === 'REQUEST_AUDIO_STATE') broadcastState(); 
                }
                // REMOTE: Recebe Estado
                if (!isHost && msg.type === 'AUDIO_STATE') {
                    handleHostState(msg.data);
                }
            });
        }
    }, [isHost, currentMusicId, isPlaying, musicVolume, sfxVolume, crossfadeDuration]);

    useEffect(() => { if (!isHost) sendIPC('REQUEST_AUDIO_STATE', null); }, [isHost]);

    // =========================================================================
    // HOST ENGINE (SÓ RODA NA JANELA PRINCIPAL)
    // =========================================================================

    useEffect(() => {
        if (!isHost) return;

        [audioA.current, audioB.current].forEach(audio => {
            audio.loop = true;
            audio.preload = 'auto';
        });

        const handleTimeUpdate = () => {
            const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
            setCurrentTime(activeAudio.currentTime);
            setTrackDuration(activeAudio.duration || 0);
            
            // Sync periódico leve (a cada 2s) para corrigir desvios no Mestre
            if (Math.floor(activeAudio.currentTime) % 2 === 0 && Math.abs(activeAudio.currentTime % 1) < 0.1) {
                 broadcastState({ currentTime: activeAudio.currentTime });
            }
        };

        const addListeners = (audio, label) => {
            audio.addEventListener('timeupdate', () => { if(activeDeckRef.current === label) handleTimeUpdate(); });
            audio.addEventListener('loadedmetadata', () => { if(activeDeckRef.current === label) handleTimeUpdate(); });
            audio.addEventListener('ended', () => { if(activeDeckRef.current === label) updateHostState(false); });
        };

        addListeners(audioA.current, 'A');
        addListeners(audioB.current, 'B');

        return () => { stopAll(); };
    }, [isHost]);

    useEffect(() => {
        if (!isHost) return;
        if (!fadeIntervalRef.current) {
            const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
            activeAudio.volume = musicVolume;
            const inactiveAudio = activeDeckRef.current === 'A' ? audioB.current : audioA.current;
            if (inactiveAudio.volume > 0 || !inactiveAudio.paused) {
                inactiveAudio.volume = 0;
                inactiveAudio.pause();
            }
        }
    }, [musicVolume, isHost]);

    const updateHostState = (playing, extra = {}) => {
        setIsPlaying(playing);
        broadcastState({ isPlaying: playing, ...extra });
    };

    // --- HANDLERS COMANDO REMOTO ---
    const handleRemoteCommand = async (cmd) => {
        switch (cmd.action) {
            case 'PLAY_TOGGLE': playMusic(cmd.item); break; 
            case 'PAUSE': pauseMusic(); break;
            case 'STOP': stopAll(); break;
            case 'SET_MUSIC_VOLUME': setMusicVolumeState(cmd.val); break;
            case 'SET_SFX_VOLUME': setSfxVolumeState(cmd.val); break;
            case 'SET_FADE': setCrossfadeDurationState(cmd.val); break;
            case 'SEEK': seekMusic(cmd.val); break;
            case 'SFX': playSFX(cmd.item); break;
        }
    };

    // --- HANDLER ESTADO HOST (RODA NO REMOTE) ---
    const handleHostState = (state) => {
        if (state.currentMusicId !== undefined) setCurrentMusicId(state.currentMusicId);
        if (state.duration !== undefined) setTrackDuration(state.duration);
        if (state.musicVolume !== undefined) setMusicVolumeState(state.musicVolume);
        if (state.sfxVolume !== undefined) setSfxVolumeState(state.sfxVolume);
        if (state.crossfadeDuration !== undefined) setCrossfadeDurationState(state.crossfadeDuration);
        
        // Sincronia de Estado e Tempo
        if (state.isPlaying !== undefined) {
            setIsPlaying(state.isPlaying);
            // Se pausou, força o tempo exato para alinhar
            if (state.isPlaying === false && state.currentTime !== undefined) {
                setCurrentTime(state.currentTime);
            }
        }
        
        // Sincronia suave: Só corrige se o desvio for > 2s enquanto toca
        if (state.currentTime !== undefined && state.isPlaying) {
            if (Math.abs(state.currentTime - currentTime) > 2.0) {
                setCurrentTime(state.currentTime);
            }
        } else if (state.currentTime !== undefined && !state.isPlaying) {
            setCurrentTime(state.currentTime);
        }
    };

    // [CORREÇÃO CRÍTICA] Ghost Timer com useRef para evitar múltiplos loops
    const animationFrameRef = useRef();

    useEffect(() => {
        if (isHost || !isPlaying) return;

        let lastTime = performance.now();

        const tick = () => {
            const now = performance.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            
            // Avança o tempo localmente para suavidade visual
            setCurrentTime(prev => {
                const next = prev + dt;
                // Impede que passe da duração total
                return trackDuration > 0 && next > trackDuration ? trackDuration : next;
            });
            
            animationFrameRef.current = requestAnimationFrame(tick);
        };

        animationFrameRef.current = requestAnimationFrame(tick);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isHost, isPlaying, trackDuration]);

    // =========================================================================
    // FADE SYSTEM
    // =========================================================================

    const clearFade = () => {
        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
        }
    };

    const performCrossfade = (incoming, outgoing, targetVol) => {
        clearFade();
        const duration = crossfadeDuration;
        
        incoming.volume = 0;
        incoming.play().catch(e => console.error(e));

        if (duration <= 0) {
            incoming.volume = targetVol;
            outgoing.pause(); outgoing.currentTime = 0; outgoing.volume = 0;
            return;
        }

        const step = 50;
        const steps = duration / step;
        const volStep = targetVol / steps;

        fadeIntervalRef.current = setInterval(() => {
            let fading = false;
            if (incoming.volume < targetVol) { incoming.volume = Math.min(incoming.volume + volStep, targetVol); fading = true; }
            if (outgoing.volume > 0) { outgoing.volume = Math.max(0, outgoing.volume - volStep); fading = true; } 
            else if (!outgoing.paused) { outgoing.pause(); outgoing.currentTime = 0; }
            
            if (!fading) { clearFade(); incoming.volume = targetVol; outgoing.volume = 0; outgoing.pause(); }
        }, step);
    };

    const performFadeOut = (audio) => {
        clearFade();
        const duration = crossfadeDuration;
        if (duration <= 0) { audio.pause(); return; }
        const step = 50;
        const volStep = audio.volume / (duration / step);
        fadeIntervalRef.current = setInterval(() => {
            if (audio.volume > 0.01) audio.volume = Math.max(0, audio.volume - volStep);
            else { audio.volume = 0; audio.pause(); clearFade(); }
        }, step);
    };

    const performFadeIn = (audio, targetVol) => {
        clearFade();
        const duration = crossfadeDuration;
        if (audio.volume < 0.05) audio.volume = 0; // Só zera se estiver muito baixo
        audio.play().catch(e => console.error(e));

        if (duration <= 0) { audio.volume = targetVol; return; }
        const step = 50;
        const volStep = targetVol / steps; // steps calculado dinamicamente ou fixo? Fixo abaixo:
        const totalSteps = duration / step;
        const safeVolStep = targetVol / totalSteps;

        fadeIntervalRef.current = setInterval(() => {
            if (audio.volume < targetVol) audio.volume = Math.min(audio.volume + safeVolStep, targetVol);
            else { audio.volume = targetVol; clearFade(); }
        }, step);
    };

    const getAudioSource = async (item) => {
        if (item.url || item.src) return item.url || item.src;
        if (item.fileData) return URL.createObjectURL(new Blob([item.fileData]));
        const targetId = item.audioId || item.id;
        if (targetId && imageDB) {
            try {
                let blob = await imageDB.getAudio(targetId);
                if (!blob) blob = await imageDB.getImage(targetId);
                if (blob) return URL.createObjectURL(blob);
            } catch (err) { console.error(err); }
        }
        return null;
    };

    // =========================================================================
    // API PÚBLICA
    // =========================================================================

    const playMusic = async (item) => {
        // [REMOTE] Envia intenção de tocar/alternar
        if (!isHost) {
            sendIPC('AUDIO_CMD', { action: 'PLAY_TOGGLE', item });
            // Update Otimista visual
            const clickedId = normalizeId(item.audioId || item.id);
            if (clickedId === normalizeId(currentMusicId) && isPlaying) {
                setIsPlaying(false);
            } else {
                setIsPlaying(true);
                setCurrentMusicId(clickedId);
            }
            return;
        }

        // [HOST]
        if (!item) return;
        const audioId = normalizeId(item.audioId || item.id);
        const currentId = normalizeId(currentMusicId);
        const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;

        // 1. MESMA MÚSICA (Toggle)
        if (currentId === audioId) {
            if (activeAudio.paused || (fadeIntervalRef.current && activeAudio.volume < (musicVolume * 0.1))) {
                setIsPlaying(true);
                performFadeIn(activeAudio, musicVolume);
                broadcastState({ isPlaying: true });
            } else {
                pauseMusic();
            }
            return;
        }

        // 2. NOVA MÚSICA
        const outgoing = activeAudio;
        const nextDeck = activeDeckRef.current === 'A' ? 'B' : 'A';
        const incoming = nextDeck === 'A' ? audioA.current : audioB.current;

        setCurrentMusicId(audioId);
        setIsPlaying(true);
        // Reseta o tempo visual para 0 imediatamente na troca
        setCurrentTime(0); 
        broadcastState({ currentMusicId: audioId, isPlaying: true, currentTime: 0 });

        const src = await getAudioSource(item);
        if (src) {
            incoming.src = src;
            incoming.load();
            activeDeckRef.current = nextDeck;
            performCrossfade(incoming, outgoing, musicVolume);
        }
    };

    const pauseMusic = () => {
        if (!isHost) {
            sendIPC('AUDIO_CMD', { action: 'PAUSE' });
            setIsPlaying(false);
            return;
        }
        const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
        setIsPlaying(false);
        performFadeOut(activeAudio);
        // Envia o tempo exato do pause para alinhar as telas
        broadcastState({ isPlaying: false, currentTime: activeAudio.currentTime }); 
    };

    const stopAll = () => {
        if (!isHost) { sendIPC('AUDIO_CMD', { action: 'STOP' }); setIsPlaying(false); setCurrentMusicId(null); return; }
        setIsPlaying(false); clearFade();
        [audioA.current, audioB.current].forEach(a => { a.pause(); a.currentTime = 0; a.volume = 0; });
        setCurrentMusicId(null); setCurrentTime(0);
        broadcastState({ isPlaying: false, currentMusicId: null, currentTime: 0 });
    };

    const seekMusic = (time) => {
        if (!isHost) { sendIPC('AUDIO_CMD', { action: 'SEEK', val: time }); setCurrentTime(time); return; }
        const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
        activeAudio.currentTime = time; setCurrentTime(time); broadcastState({ currentTime: time });
    };

    const setMusicVolume = (val) => {
        if (!isHost) sendIPC('AUDIO_CMD', { action: 'SET_MUSIC_VOLUME', val });
        setMusicVolumeState(val); if(isHost) broadcastState({ musicVolume: val });
    };

    const setSfxVolume = (val) => {
        if (!isHost) sendIPC('AUDIO_CMD', { action: 'SET_SFX_VOLUME', val });
        setSfxVolumeState(val); if(isHost) broadcastState({ sfxVolume: val });
    };

    const setCrossfadeDuration = (val) => {
        if (!isHost) sendIPC('AUDIO_CMD', { action: 'SET_FADE', val });
        setCrossfadeDurationState(val); if(isHost) broadcastState({ crossfadeDuration: val });
    };

    const playSFX = async (item) => {
        if (!isHost) { sendIPC('AUDIO_CMD', { action: 'SFX', item }); return; }
        const src = await getAudioSource(item);
        if (src) { const sfx = new Audio(src); sfx.volume = sfxVolume; sfx.play().catch(e => console.error(e)); }
    };

    return (
        <AudioContext.Provider value={{
            playMusic, pauseMusic, stopAll, playSFX,
            musicVolume, setMusicVolume, sfxVolume, setSfxVolume,
            currentMusicId, isPlaying, currentTime, trackDuration, seekMusic,
            crossfadeDuration, setCrossfadeDuration
        }}>
            {children}
        </AudioContext.Provider>
    );
};