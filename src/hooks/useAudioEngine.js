// src/hooks/useAudioEngine.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { useGame } from '../context/GameContext';
import { audioDB } from '../context/audioDb'; 

export const useAudioEngine = () => {
    const { soundboard, isGMWindow } = useGame();
    const currentMusicRef = useRef(null);
    const oldMusicRef = useRef(null);
    const currentBlobUrl = useRef(null);

    // --- 1. CONTROLE DE VOLUME MASTER & GM MUTE ---
    useEffect(() => {
        if (isGMWindow) {
            Howler.mute(true);
        } else {
            Howler.mute(false);
            const vol = soundboard?.masterVolume?.music ?? 0.5;
            Howler.volume(vol); 
        }
    }, [isGMWindow, soundboard?.masterVolume?.music]);

    // --- NOVO: CLEANUP GERAL (STOP ON EXIT) ---
    useEffect(() => {
        return () => {
            // Quando o hook desmonta (sair da aventura), para tudo.
            Howler.stop();
            Howler.unload();
            if (currentBlobUrl.current) URL.revokeObjectURL(currentBlobUrl.current);
        };
    }, []);

    // --- 2. GERENCIAMENTO DA FAIXA DE MÚSICA (CROSSFADE) ---
    useEffect(() => {
        if (!soundboard) return;

        const track = soundboard.activeTrack;
        const fadeTime = soundboard.fadeSettings?.crossfade ? (soundboard.fadeSettings.fadeIn || 2000) : 0;

        const handleMusicChange = async () => {
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

            if (currentMusicRef.current && track.fileId === currentMusicRef.current._fileId) {
                if (track.isPlaying && !currentMusicRef.current.playing()) {
                    currentMusicRef.current.play();
                    currentMusicRef.current.fade(0, track.volume || 1, 1000);
                } else if (!track.isPlaying && currentMusicRef.current.playing()) {
                    currentMusicRef.current.pause();
                }
                if (track.volume !== undefined) {
                    currentMusicRef.current.volume(track.volume);
                }
                return;
            }

            if (currentMusicRef.current) {
                oldMusicRef.current = currentMusicRef.current;
                oldMusicRef.current.fade(oldMusicRef.current.volume(), 0, fadeTime);
                setTimeout(() => {
                    oldMusicRef.current?.unload();
                    oldMusicRef.current = null;
                }, fadeTime + 100);
            }

            try {
                const blob = await audioDB.getAudio(track.fileId);
                if (!blob) return;

                if (currentBlobUrl.current) URL.revokeObjectURL(currentBlobUrl.current);
                
                const url = URL.createObjectURL(blob);
                currentBlobUrl.current = url;

                const newHowl = new Howl({
                    src: [url],
                    html5: true, 
                    loop: true,  
                    volume: 0,   
                    onend: () => {}
                });

                newHowl._fileId = track.fileId;

                if (track.isPlaying) {
                    newHowl.play();
                    newHowl.fade(0, track.volume || 1, fadeTime);
                }

                currentMusicRef.current = newHowl;

            } catch (e) { console.error("Erro música:", e); }
        };

        handleMusicChange();

    }, [soundboard?.activeTrack?.fileId, soundboard?.activeTrack?.isPlaying, soundboard?.activeTrack?.volume]); 

    useEffect(() => {
        const interval = setInterval(() => {
            if (currentMusicRef.current && currentMusicRef.current.playing()) {
                const seek = currentMusicRef.current.seek();
                const event = new CustomEvent('ecos-audio-progress', { detail: { progress: seek } });
                window.dispatchEvent(event);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    
    const triggerSfx = async (sfxItem) => {
        if (!sfxItem || !sfxItem.fileId) return;
        const masterSfx = soundboard?.masterVolume?.sfx ?? 1.0;
        const finalVol = (sfxItem.volume || 1) * masterSfx;
        
        try {
            const blob = await audioDB.getAudio(sfxItem.fileId);
            if(blob) {
                const url = URL.createObjectURL(blob);
                const sfx = new Howl({
                    src: [url],
                    format: ['mp3', 'ogg', 'wav', 'webm'],
                    html5: false,
                    volume: finalVol,
                    onplayerror: (id, err) => { sfx.once('unlock', () => sfx.play()); },
                    onend: () => URL.revokeObjectURL(url)
                });
                sfx.play();
            }
        } catch (error) { console.error("Erro SFX:", error); }
    };

    useEffect(() => {
        const handleSfxEvent = (e) => {
            const sfxItem = e.detail;
            if (sfxItem) triggerSfx(sfxItem);
        };
        window.addEventListener('ecos-sfx-trigger', handleSfxEvent);
        return () => window.removeEventListener('ecos-sfx-trigger', handleSfxEvent);
    }, [soundboard?.masterVolume?.sfx]); 

    return { triggerSfx };
};