import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, LogOut, Download, Check, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { useNetwork } from '../../network';

// Toca o áudio transmitido pelo mestre (músicas e efeitos).
export const RemoteAudio = () => {
    const { audioStream, playerVolume } = useNetwork();
    const audioRef = useRef(null);

    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        el.srcObject = audioStream || null;
        if (audioStream) el.play().catch(() => {});
    }, [audioStream]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = playerVolume;
    }, [playerVolume]);

    return <audio ref={audioRef} autoPlay className="hidden" />;
};

const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

// Barra discreta do jogador: estado da conexão, downloads, volume e sair.
const PlayerHUD = ({ visible }) => {
    const t = useTranslation();
    const { status, roomCode, playerName, downloadStats, playerVolume, setPlayerVolume, leaveRoom } = useNetwork();
    const [confirmLeave, setConfirmLeave] = useState(false);
    const lastVolumeRef = useRef(playerVolume || 0.8);

    const isReconnecting = status === 'reconnecting';
    const downloading = downloadStats.active + downloadStats.waiting > 0;
    const percent = downloadStats.total > 0 ? Math.round((downloadStats.received / downloadStats.total) * 100) : 0;

    const toggleMute = () => {
        if (playerVolume > 0) { lastVolumeRef.current = playerVolume; setPlayerVolume(0); }
        else setPlayerVolume(lastVolumeRef.current || 0.8);
    };

    return (
        <div
            data-ecos-ui="true"
            className={`absolute bottom-4 left-4 z-50 flex items-center gap-1 bg-black/80 border border-glass-border rounded-lg shadow-lg backdrop-blur-sm p-1.5 pointer-events-auto transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
            onMouseDown={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 px-2" title={isReconnecting ? t('lobby.reconnectingTitle') : t('hud.connected')}>
                <span className={`w-2 h-2 rounded-full ${isReconnecting ? 'bg-yellow-400 animate-pulse' : 'bg-neon-green shadow-[0_0_6px_#39ff14]'}`} />
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-mono font-bold text-white tracking-widest">{roomCode}</span>
                    <span className="text-[9px] text-text-muted uppercase tracking-wider mt-0.5 max-w-[120px] truncate">
                        {isReconnecting ? t('lobby.reconnectingTitle') : playerName}
                    </span>
                </div>
            </div>

            {downloading && (
                <>
                    <div className="w-px h-6 bg-glass-border mx-1" />
                    <div className="flex items-center gap-2 px-2 text-neon-blue" title={t('hud.downloadingTitle')}>
                        <Download size={14} className="animate-pulse" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] font-bold">{percent}%</span>
                            <span className="text-[9px] text-text-muted">{formatMB(downloadStats.received)}/{formatMB(downloadStats.total)} MB</span>
                        </div>
                    </div>
                </>
            )}

            <div className="w-px h-6 bg-glass-border mx-1" />
            <button onClick={toggleMute} className="p-2 rounded hover:bg-white/10 text-text-muted hover:text-white transition" title={t('hud.volume')}>
                {playerVolume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <input
                type="range" min="0" max="1" step="0.01"
                value={playerVolume}
                onChange={e => setPlayerVolume(Number(e.target.value))}
                className="w-20 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none mr-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />

            <div className="w-px h-6 bg-glass-border mx-1" />
            {confirmLeave ? (
                <div className="flex items-center gap-1 pl-1 animate-in fade-in">
                    <span className="text-[10px] font-bold uppercase text-white mr-1">{t('hud.leaveQuestion')}</span>
                    <button onClick={() => setConfirmLeave(false)} className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white" title={t('common.cancel')}><X size={14} /></button>
                    <button onClick={leaveRoom} className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white" title={t('common.confirm')}><Check size={14} /></button>
                </div>
            ) : (
                <button onClick={() => setConfirmLeave(true)} className="p-2 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500 transition" title={t('lobby.leave')}>
                    <LogOut size={16} />
                </button>
            )}
        </div>
    );
};

export default PlayerHUD;
