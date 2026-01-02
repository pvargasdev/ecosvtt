// src/hooks/useAudioEngine.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { useGame } from '../context/GameContext';
// [CORREÇÃO AQUI]: O audioDB fica em 'audioDb', não em 'db'
import { audioDB } from '../context/audioDb'; 

export const useAudioEngine = () => {
    const { soundboard, isGMWindow } = useGame();
    
    // Refs para manter controle das instâncias de áudio sem causar re-renders
    const currentMusicRef = useRef(null);
    const oldMusicRef = useRef(null); // Para o crossfade
    
    // Estado local para URL do blob atual (para limpeza)
    const currentBlobUrl = useRef(null);

    // --- 1. CONTROLE DE VOLUME MASTER & GM MUTE ---
    useEffect(() => {
        // Se for janela do Mestre, muta globalmente para evitar eco (controle remoto)
        if (isGMWindow) {
            Howler.mute(true);
        } else {
            Howler.mute(false);
            // Aplica o volume master definido no contexto
            const vol = soundboard?.masterVolume?.music ?? 0.5;
            Howler.volume(vol); 
        }
    }, [isGMWindow, soundboard?.masterVolume?.music]);


    // --- 2. GERENCIAMENTO DA FAIXA DE MÚSICA (CROSSFADE) ---
    useEffect(() => {
        if (!soundboard) return;

        const track = soundboard.activeTrack;
        const fadeTime = soundboard.fadeSettings?.crossfade ? (soundboard.fadeSettings.fadeIn || 2000) : 0;

        const handleMusicChange = async () => {
            // Caso 1: Nenhuma música ativa no estado -> Parar tudo
            if (!track || !track.fileId) {
                if (currentMusicRef.current) {
                    currentMusicRef.current.fade(currentMusicRef.current.volume(), 0, fadeTime);
                    setTimeout(() => {
                        currentMusicRef.current?.stop();
                        currentMusicRef.current = null;
                    }, fadeTime);
                }
                return;
            }

            // Caso 2: Pausar/Despausar a mesma música
            if (currentMusicRef.current && track.fileId === currentMusicRef.current._fileId) {
                if (track.isPlaying && !currentMusicRef.current.playing()) {
                    currentMusicRef.current.play();
                    // Fade In suave ao despausar
                    currentMusicRef.current.fade(0, track.volume || 1, 1000);
                } else if (!track.isPlaying && currentMusicRef.current.playing()) {
                    currentMusicRef.current.pause();
                }
                // Atualizar volume se mudou no slider individual
                if (track.volume !== undefined) {
                    currentMusicRef.current.volume(track.volume);
                }
                return;
            }

            // Caso 3: Troca de Música (Crossfade)
            
            // A. Move a música atual para "Old" e inicia fade out
            if (currentMusicRef.current) {
                oldMusicRef.current = currentMusicRef.current;
                oldMusicRef.current.fade(oldMusicRef.current.volume(), 0, fadeTime);
                
                // Limpa a instância antiga após o fade
                setTimeout(() => {
                    oldMusicRef.current?.unload();
                    oldMusicRef.current = null;
                }, fadeTime + 100);
            }

            // B. Carrega a Nova Música
            try {
                const blob = await audioDB.getAudio(track.fileId);
                if (!blob) {
                    console.error("Audio Blob not found:", track.fileId);
                    return;
                }

                // Limpa URL anterior para memória
                if (currentBlobUrl.current) URL.revokeObjectURL(currentBlobUrl.current);
                
                const url = URL.createObjectURL(blob);
                currentBlobUrl.current = url;

                const newHowl = new Howl({
                    src: [url],
                    html5: true, // Força HTML5 Audio para arquivos grandes (streaming)
                    loop: true,  // Soundtracks geralmente loopam
                    volume: 0,   // Começa em 0 para o fade in
                    onend: () => {
                         // Lógica de playlist avançar (se não for loop) pode ser implementada aqui
                    }
                });

                // Hack para identificar o arquivo dentro do objeto Howl
                newHowl._fileId = track.fileId;

                if (track.isPlaying) {
                    newHowl.play();
                    newHowl.fade(0, track.volume || 1, fadeTime);
                }

                currentMusicRef.current = newHowl;

            } catch (e) {
                console.error("Erro ao carregar música:", e);
            }
        };

        handleMusicChange();

    }, [soundboard?.activeTrack?.fileId, soundboard?.activeTrack?.isPlaying, soundboard?.activeTrack?.volume]); 


    // --- 3. LOOP DE SINCRONIA VISUAL (PROGRESS BAR) ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (currentMusicRef.current && currentMusicRef.current.playing()) {
                const seek = currentMusicRef.current.seek();
                // Emitir evento customizado no DOM para a UI pegar sem React re-render total
                const event = new CustomEvent('ecos-audio-progress', { detail: { progress: seek } });
                window.dispatchEvent(event);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);
    
    // --- 4. FUNÇÕES EXPOSTAS (SFX) ---
    const triggerSfx = async (sfxItem) => {
        if (!sfxItem || !sfxItem.fileId) return;
        
        // Volume específico do SFX * Volume Master de SFX
        const masterSfx = soundboard?.masterVolume?.sfx ?? 1.0;
        const finalVol = (sfxItem.volume || 1) * masterSfx;
        
        const blob = await audioDB.getAudio(sfxItem.fileId);
        if(blob) {
            const url = URL.createObjectURL(blob);
            const sfx = new Howl({
                src: [url],
                volume: finalVol,
                onend: () => URL.revokeObjectURL(url) // Limpeza automática
            });
            sfx.play();
        }
    };

    // --- 5. LISTENER DE SFX (EVENTO DISPARADO REMOTA OU LOCALMENTE) ---
    useEffect(() => {
        const handleSfxEvent = (e) => {
            const sfxItem = e.detail;
            if (sfxItem) triggerSfx(sfxItem);
        };

        window.addEventListener('ecos-sfx-trigger', handleSfxEvent);
        return () => window.removeEventListener('ecos-sfx-trigger', handleSfxEvent);
    }, [soundboard?.masterVolume?.sfx]); 

    return {
        triggerSfx
    };
};