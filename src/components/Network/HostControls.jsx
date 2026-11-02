import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Users, Copy, Check, Crosshair, UserX, MapPin, MapPinOff, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { useNetwork } from '../../network';
import { useGame } from '../../context/GameContext';

export const CopyCodeButton = ({ code, className = '' }) => {
    const t = useTranslation();
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    };

    return (
        <button onClick={copy} className={`flex items-center gap-2 transition ${className}`} title={t('host.copyCode')}>
            <span className="font-mono font-bold tracking-widest">{code}</span>
            {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} className="opacity-60" />}
        </button>
    );
};

// Controles exclusivos do mestre numa sala online, na barra superior do tabuleiro.
const HostControls = () => {
    const t = useTranslation();
    const { status, roomCode, players, kickPlayer } = useNetwork();
    const { activeAdventure, toggleAdventurePinVisibility } = useGame();
    const [isOpen, setIsOpen] = useState(false);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const panelRef = useRef(null);

    // A barra superior corta o que passa da borda (overflow-hidden), então o painel
    // é renderizado fora dela, posicionado abaixo do botão.
    const togglePanel = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPanelPos({ top: rect.bottom + 10, left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)) });
        }
        setIsOpen(o => !o);
    };

    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e) => {
            if (buttonRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [isOpen]);

    const pinsVisibleToPlayers = activeAdventure?.pinSettings ? activeAdventure.pinSettings.main : true;
    const isOnline = status === 'open';

    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 px-2" title={isOnline ? t('host.roomOpen') : t('host.roomConnecting')}>
                {isOnline ? <Wifi size={14} className="text-neon-blue" /> : <WifiOff size={14} className="text-yellow-400 animate-pulse" />}
                {roomCode && <CopyCodeButton code={roomCode} className="text-xs text-white hover:text-neon-blue" />}
            </div>

            <div className="relative" ref={buttonRef}>
                <button
                    onClick={togglePanel}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded hover:bg-white/10 transition ${isOpen ? 'text-neon-blue bg-white/10' : 'text-text-muted'}`}
                    title={t('host.players')}
                >
                    <Users size={18} />
                    <span className="text-xs font-bold">{players.length}</span>
                </button>

                {isOpen && createPortal(
                    <div
                        ref={panelRef}
                        data-ecos-window="true"
                        data-ecos-ui="true"
                        style={{ position: 'fixed', top: panelPos.top, left: panelPos.left }}
                        onMouseDown={e => e.stopPropagation()}
                        onWheel={e => e.stopPropagation()}
                        className="w-72 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-[60] overflow-hidden animate-in fade-in pointer-events-auto cursor-default"
                    >
                        <div className="p-3 border-b border-glass-border bg-white/5 flex justify-between items-center">
                            <h3 className="font-rajdhani font-bold text-white text-sm flex items-center gap-2"><Users size={14} /> {t('host.players')}</h3>
                            <span className="text-[10px] text-text-muted font-bold">{players.length}</span>
                        </div>

                        <div className="max-h-56 overflow-y-auto scrollbar-thin p-2 bg-black/20">
                            {players.length === 0 ? (
                                <p className="text-xs text-text-muted italic text-center py-4 px-2">{t('host.noPlayers', { code: roomCode })}</p>
                            ) : players.map(p => (
                                <div key={p.id} className="flex items-center justify-between px-2 py-2 rounded hover:bg-white/5 group">
                                    <span className="flex items-center gap-2 text-sm text-white truncate">
                                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green shrink-0" /> {p.name}
                                    </span>
                                    <button onClick={() => kickPlayer(p.id)} className="p-1 rounded text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition" title={t('host.kick')}>
                                        <UserX size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-2 border-t border-glass-border space-y-1">
                            <button
                                onClick={() => toggleAdventurePinVisibility(false)}
                                className="w-full flex items-center gap-2 px-2 py-2 rounded text-xs text-text-muted hover:text-white hover:bg-white/5 transition"
                            >
                                {pinsVisibleToPlayers ? <MapPin size={14} /> : <MapPinOff size={14} />}
                                {pinsVisibleToPlayers ? t('host.hidePinsFromPlayers') : t('host.showPinsToPlayers')}
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            <button
                onClick={() => window.dispatchEvent(new CustomEvent('ecos-share-view-request'))}
                disabled={players.length === 0}
                className="p-2 rounded hover:bg-white/10 transition text-text-muted hover:text-neon-blue disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
                title={t('host.shareView')}
            >
                <Crosshair size={18} />
            </button>
        </div>
    );
};

export default HostControls;
