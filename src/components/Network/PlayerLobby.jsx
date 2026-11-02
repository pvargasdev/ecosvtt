import React from 'react';
import { Loader2, Wifi, WifiOff, ArrowLeft, Hourglass } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { useNetwork } from '../../network';
import NetworkCompatibility from './NetworkCompatibility';

// Tela do jogador enquanto não há aventura para mostrar: conectando, aguardando
// o mestre escolher uma aventura, ou explicando por que a conexão falhou.
const PlayerLobby = () => {
    const t = useTranslation();
    const { status, error, roomCode, playerName, leaveRoom, backToStart } = useNetwork();

    const isError = status === 'closed' || status === 'error';
    const isConnecting = status === 'connecting';

    let Icon = Hourglass, title = t('lobby.waitingTitle'), subtitle = t('lobby.waitingSubtitle'), color = 'text-neon-green';
    if (isConnecting) { Icon = Loader2; title = t('lobby.connectingTitle'); subtitle = t('lobby.connectingSubtitle', { code: roomCode }); color = 'text-neon-blue'; }
    if (status === 'reconnecting') { Icon = Loader2; title = t('lobby.reconnectingTitle'); subtitle = t('lobby.reconnectingSubtitle'); color = 'text-yellow-400'; }
    if (isError) { Icon = WifiOff; title = t('lobby.errorTitle'); subtitle = t(`network.errors.${error || 'connectionLost'}`); color = 'text-red-400'; }

    return (
        <div className="w-full h-screen bg-[#09090b] flex flex-col items-center justify-center text-white relative font-inter select-none animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1f1f23_0%,_#000000_100%)] pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center max-w-md text-center px-6">
                <div className={`w-28 h-28 rounded-3xl border border-white/5 bg-white/[0.02] flex items-center justify-center mb-8 shadow-2xl ${color}`}>
                    <Icon size={44} strokeWidth={1.3} className={Icon === Loader2 ? 'animate-spin' : (Icon === Hourglass ? 'animate-pulse' : '')} />
                </div>
                <h1 className="text-3xl font-rajdhani font-bold tracking-[0.2em] uppercase mb-3">{title}</h1>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">{subtitle}</p>

                {isError && ['timeout', 'roomNotFound', 'connectionLost'].includes(error) && (
                    <NetworkCompatibility compact className="mb-8" />
                )}

                {!isError && roomCode && (
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full border border-white/5 bg-white/[0.02] mb-8">
                        <Wifi size={12} className={color} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('lobby.roomLabel', { code: roomCode })}</span>
                        {playerName && <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">· {playerName}</span>}
                    </div>
                )}

                <button
                    onClick={isError ? backToStart : leaveRoom}
                    className="flex items-center gap-2 px-6 py-3 rounded text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 transition"
                >
                    <ArrowLeft size={14} /> {isError ? t('lobby.backToStart') : t('lobby.leave')}
                </button>
            </div>
        </div>
    );
};

export default PlayerLobby;
