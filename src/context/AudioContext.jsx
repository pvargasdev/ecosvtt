import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { imageDB } from './db'; 

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children }) => {
    // --- ARQUITETURA DECK DUPLO (Para Crossfade) ---
    // Precisamos de dois elementos de áudio para fazer a transição suave
    const audioA = useRef(new Audio());
    const audioB = useRef(new Audio());
    
    // Controla qual deck é o "Principal" no momento
    const activeDeckRef = useRef('A'); // 'A' ou 'B'
    
    // Referência para o intervalo de fade (para limpar se trocar rápido)
    const fadeIntervalRef = useRef(null);

    // --- ESTADOS DA UI ---
    const [currentMusicId, setCurrentMusicId] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false); // Estado visual (responsivo)
    const [currentTime, setCurrentTime] = useState(0);
    const [trackDuration, setTrackDuration] = useState(0);

    // --- CONFIGURAÇÕES ---
    const [musicVolume, setMusicVolume] = useState(0.5);
    const [sfxVolume, setSfxVolume] = useState(0.5);
    const [crossfadeDuration, setCrossfadeDuration] = useState(2000); 

    // --- INICIALIZAÇÃO E LISTENERS ---
    useEffect(() => {
        // Configura ambos os decks
        [audioA.current, audioB.current].forEach(audio => {
            audio.loop = true;
            // Previne erros de play não iniciado
            audio.onplay = () => {}; 
            audio.onpause = () => {};
        });

        // Função para atualizar a barra de tempo (apenas do deck ativo)
        const handleTimeUpdate = () => {
            const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
            setCurrentTime(activeAudio.currentTime);
            setTrackDuration(activeAudio.duration || 0);
        };

        // Adiciona listeners em ambos
        audioA.current.addEventListener('timeupdate', () => { if(activeDeckRef.current === 'A') handleTimeUpdate(); });
        audioB.current.addEventListener('timeupdate', () => { if(activeDeckRef.current === 'B') handleTimeUpdate(); });
        
        audioA.current.addEventListener('loadedmetadata', () => { if(activeDeckRef.current === 'A') handleTimeUpdate(); });
        audioB.current.addEventListener('loadedmetadata', () => { if(activeDeckRef.current === 'B') handleTimeUpdate(); });

        return () => {
            // Cleanup básico (opcional, pois refs persistem)
        };
    }, []);

    // Atualiza volume MESTRE em tempo real (se não estiver ocorrendo fade)
    useEffect(() => {
        if (!fadeIntervalRef.current) {
            // Aplica volume no deck ativo imediatamente
            const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
            activeAudio.volume = musicVolume;
            
            // O outro deck deve estar mudo/parado, mas garantimos:
            const inactiveAudio = activeDeckRef.current === 'A' ? audioB.current : audioA.current;
            if (inactiveAudio.paused) inactiveAudio.volume = 0; 
        }
    }, [musicVolume]);

    // --- SISTEMA DE CROSSFADE AVANÇADO ---

    const clearFade = () => {
        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
        }
    };

    /**
     * Realiza o Crossfade:
     * - Incoming (Entrando): Volume 0 -> Target
     * - Outgoing (Saindo): Volume Atual -> 0
     */
    const performCrossfade = (incomingAudio, outgoingAudio, targetVol) => {
        clearFade();
        const duration = crossfadeDuration;
        
        // Configura inicial
        incomingAudio.volume = 0;
        incomingAudio.play().catch(e => console.error("Erro play incoming:", e));
        
        // Se fade for 0, troca seca
        if (duration <= 0) {
            incomingAudio.volume = targetVol;
            outgoingAudio.pause();
            outgoingAudio.currentTime = 0;
            outgoingAudio.volume = 0;
            return;
        }

        const stepTime = 50; // ms
        const steps = duration / stepTime;
        const volStep = targetVol / steps;

        fadeIntervalRef.current = setInterval(() => {
            let stillFading = false;

            // Fade IN (Incoming)
            if (incomingAudio.volume < targetVol) {
                const newVol = Math.min(incomingAudio.volume + volStep, targetVol);
                incomingAudio.volume = newVol;
                stillFading = true;
            }

            // Fade OUT (Outgoing)
            if (outgoingAudio.volume > 0) {
                const newVol = Math.max(0, outgoingAudio.volume - volStep);
                outgoingAudio.volume = newVol;
                stillFading = true;
            } else if (!outgoingAudio.paused) {
                outgoingAudio.pause();
                outgoingAudio.currentTime = 0; // Reseta o antigo
            }

            if (!stillFading) {
                clearFade();
                // Garante valores finais limpos
                incomingAudio.volume = targetVol;
                outgoingAudio.volume = 0;
                outgoingAudio.pause();
            }
        }, stepTime);
    };

    /**
     * Fade Out Simples (Pause)
     * Agora com resposta visual imediata
     */
    const performFadeOut = (audioElement) => {
        clearFade();
        const duration = crossfadeDuration;
        
        if (duration <= 0) {
            audioElement.pause();
            return;
        }

        const stepTime = 50;
        const steps = duration / stepTime;
        const volStep = audioElement.volume / steps;

        fadeIntervalRef.current = setInterval(() => {
            if (audioElement.volume > 0.01) {
                const newVol = Math.max(0, audioElement.volume - volStep);
                audioElement.volume = newVol;
            } else {
                audioElement.volume = 0;
                audioElement.pause();
                clearFade();
            }
        }, stepTime);
    };

    const performFadeIn = (audioElement, targetVol) => {
        clearFade();
        const duration = crossfadeDuration;
        audioElement.volume = 0;
        audioElement.play().catch(e => console.error(e));

        if (duration <= 0) {
            audioElement.volume = targetVol;
            return;
        }

        const stepTime = 50;
        const steps = duration / stepTime;
        const volStep = targetVol / steps;

        fadeIntervalRef.current = setInterval(() => {
            if (audioElement.volume < targetVol) {
                audioElement.volume = Math.min(audioElement.volume + volStep, targetVol);
            } else {
                audioElement.volume = targetVol;
                clearFade();
            }
        }, stepTime);
    };

    // --- RECUPERAÇÃO DE ARQUIVO ---
    const getAudioSource = async (item) => {
        if (item.url || item.src) return item.url || item.src;
        if (item.fileData) return URL.createObjectURL(new Blob([item.fileData]));

        const targetId = item.audioId || item.id;
        if (targetId && imageDB) {
            try {
                let blob = await imageDB.getAudio(targetId);
                if (!blob) blob = await imageDB.getImage(targetId); // Fallback
                if (blob) return URL.createObjectURL(blob);
            } catch (err) { console.error(err); }
        }
        return null;
    };

    // --- CONTROLES PÚBLICOS ---

    const playMusic = async (item) => {
        if (!item) return;
        const audioId = item.audioId || item.id;

        // 1. Lógica de Toggle (Mesma música)
        if (currentMusicId === audioId) {
            const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
            
            if (activeAudio.paused) {
                // RESPOSTA VISUAL IMEDIATA:
                setIsPlaying(true); 
                performFadeIn(activeAudio, musicVolume);
            } else {
                pauseMusic();
            }
            return;
        }

        // 2. Tocar NOVA música (Crossfade)
        // Identifica quem sai e quem entra
        const outgoingDeck = activeDeckRef.current;
        const incomingDeck = outgoingDeck === 'A' ? 'B' : 'A';
        
        const outgoingAudio = outgoingDeck === 'A' ? audioA.current : audioB.current;
        const incomingAudio = incomingDeck === 'A' ? audioA.current : audioB.current;

        // RESPOSTA VISUAL IMEDIATA
        setIsPlaying(true); 
        setCurrentMusicId(audioId);

        // Prepara o incoming
        const src = await getAudioSource(item);
        if (src) {
            incomingAudio.src = src;
            incomingAudio.load();
            
            // Inicia o Crossfade (Um sobe, o outro desce)
            performCrossfade(incomingAudio, outgoingAudio, musicVolume);
            
            // Troca a referência do deck ativo
            activeDeckRef.current = incomingDeck;
        }
    };

    const pauseMusic = () => {
        // RESPOSTA VISUAL IMEDIATA: 
        // Setamos false na hora, mesmo que o áudio continue tocando o fade out
        setIsPlaying(false);

        const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
        performFadeOut(activeAudio);
    };

    const stopAll = () => {
        setIsPlaying(false);
        clearFade();
        
        // Reseta ambos os decks
        [audioA.current, audioB.current].forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0;
        });
        
        setCurrentMusicId(null);
    };

    const seekMusic = (time) => {
        const activeAudio = activeDeckRef.current === 'A' ? audioA.current : audioB.current;
        if (activeAudio) {
            activeAudio.currentTime = time;
            setCurrentTime(time);
        }
    };

    const playSFX = async (item) => {
        const src = await getAudioSource(item);
        if (src) {
            const sfx = new Audio(src);
            sfx.volume = sfxVolume;
            sfx.play().catch(e => console.error(e));
        }
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