import { useEffect, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { useGame } from '../context/GameContext';
import { audioDB } from '../context/audioDb'; 

export const useAudioEngine = () => {
    const { soundboard, isGMWindow } = useGame();
    
    const currentMusicRef = useRef(null);
    const oldMusicRef = useRef(null); 
    const currentBlobUrl = useRef(null);
    
    const activeSfxInstances = useRef({});

    useEffect(() => {
        if (isGMWindow) {
            Howler.mute(true);
        } else {
            Howler.mute(false);
            const vol = soundboard?.masterVolume?.music ?? 0.5;
            Howler.volume(vol); 
        }
    }, [isGMWindow, soundboard?.masterVolume?.music]);

    useEffect(() => {
        return () => {
            Howler.stop();
            Howler.unload();
            if (currentBlobUrl.current) URL.revokeObjectURL(currentBlobUrl.current);
        };
    }, []);

    useEffect(() => {
        if (!soundboard) return;
        const track = soundboard.activeTrack;
        const fadeTime = soundboard.fadeSettings?.crossfade ? (soundboard.fadeSettings.fadeIn || 2000) : 0;

        const handleMusicChange = async () => {
            if (!track || !track.fileId) {
                if (currentMusicRef.current) {
                    currentMusicRef.current.fade(currentMusicRef.current.volume(), 0, fadeTime);
                    setTimeout(() => { currentMusicRef.current?.stop(); currentMusicRef.current = null; }, fadeTime);
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
                if (track.volume !== undefined) currentMusicRef.current.volume(track.volume);
                return;
            }
            if (currentMusicRef.current) {
                oldMusicRef.current = currentMusicRef.current;
                oldMusicRef.current.fade(oldMusicRef.current.volume(), 0, fadeTime);
                setTimeout(() => { oldMusicRef.current?.unload(); oldMusicRef.current = null; }, fadeTime + 100);
            }
            try {
                const blob = await audioDB.getAudio(track.fileId);
                if (!blob) return;
                if (currentBlobUrl.current) URL.revokeObjectURL(currentBlobUrl.current);
                const url = URL.createObjectURL(blob);
                currentBlobUrl.current = url;
                const newHowl = new Howl({ src: [url], html5: true, loop: true, volume: 0 });
                newHowl._fileId = track.fileId;
                if (track.isPlaying) { newHowl.play(); newHowl.fade(0, track.volume || 1, fadeTime); }
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
        
        if (activeSfxInstances.current[sfxItem.id]) {
            const instance = activeSfxInstances.current[sfxItem.id];
            instance.stop();
            activeSfxInstances.current[sfxItem.id] = null;
            window.dispatchEvent(new CustomEvent(`ecos-sfx-end-${sfxItem.id}`));
            return;
        }

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
                    onplay: () => {
                        window.dispatchEvent(new CustomEvent(`ecos-sfx-start-${sfxItem.id}`));
                    },
                    onend: () => {
                        window.dispatchEvent(new CustomEvent(`ecos-sfx-end-${sfxItem.id}`));
                        activeSfxInstances.current[sfxItem.id] = null;
                        URL.revokeObjectURL(url);
                    },
                    onstop: () => {
                         window.dispatchEvent(new CustomEvent(`ecos-sfx-end-${sfxItem.id}`));
                         activeSfxInstances.current[sfxItem.id] = null;
                         URL.revokeObjectURL(url);
                    }
                });
                
                activeSfxInstances.current[sfxItem.id] = sfx;
                
                sfx.play();
            }
        } catch (error) {
            console.error("Erro SFX:", error);
        }
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