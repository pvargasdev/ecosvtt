import React, { useState } from 'react';
import { Monitor, Wifi, LogIn, ArrowLeft, Settings, Maximize, LogOut, Loader2 } from 'lucide-react';
import Logo from '../../assets/logo2.png';
import SettingsModal from '../MainMenu/SettingsModal';
import { useTranslation } from '../../i18n';
import { useNetwork } from '../../network';
import { normalizeRoomCode } from '../../network/protocol';
import NetworkCompatibility from './NetworkCompatibility';

const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
};

const quitApp = () => {
    if (window.electron?.quit) window.electron.quit();
    else window.close();
};

const OptionCard = ({ icon, title, description, accent, onClick }) => (
    <button
        onClick={onClick}
        className="group relative flex-1 min-w-[220px] max-w-[300px] aspect-[4/5] rounded-2xl border border-white/5 bg-white/[0.02] p-7 flex flex-col items-start justify-end text-left transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04]"
        style={{ '--accent': accent }}
    >
        <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-[color:var(--accent)] opacity-60 transition-colors pointer-events-none" />
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-auto border border-white/10 bg-black/40 transition-all duration-300 group-hover:scale-110" style={{ color: accent }}>
            {icon}
        </div>
        <h2 className="font-rajdhani font-bold text-2xl text-white uppercase tracking-wider mb-2">{title}</h2>
        <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-300 transition-colors">{description}</p>
    </button>
);

const JoinPanel = ({ onBack }) => {
    const t = useTranslation();
    const { joinRoom, playerName } = useNetwork();
    const [name, setName] = useState(playerName);
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const normalized = normalizeRoomCode(code);
    const canJoin = !!normalized && name.trim().length > 0 && !isSubmitting;

    const handleCodeChange = (value) => {
        const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        setCode(clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canJoin) return;
        setIsSubmitting(true);
        joinRoom(normalized, name);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#121214] border border-white/10 rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
            <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition mb-6 uppercase tracking-wider font-bold">
                <ArrowLeft size={14} /> {t('common.back')}
            </button>
            <h2 className="text-2xl font-rajdhani font-bold text-white uppercase tracking-wider mb-1">{t('start.joinTitle')}</h2>
            <p className="text-xs text-gray-500 mb-8">{t('start.joinSubtitle')}</p>

            <label className="text-[10px] font-bold uppercase tracking-widest text-neon-green">{t('start.yourName')}</label>
            <input
                autoFocus={!name}
                value={name}
                maxLength={32}
                onChange={e => setName(e.target.value)}
                placeholder={t('start.namePlaceholder')}
                className="w-full bg-transparent border-b border-white/10 py-2 mb-6 text-lg font-rajdhani font-bold text-white outline-none focus:border-neon-green transition-colors placeholder-white/10"
            />

            <label className="text-[10px] font-bold uppercase tracking-widest text-neon-green">{t('start.roomCode')}</label>
            <input
                autoFocus={!!name}
                value={code}
                onChange={e => handleCodeChange(e.target.value)}
                placeholder="ABCD-1234"
                spellCheck={false}
                className="w-full bg-transparent border-b border-white/10 py-2 mb-8 text-3xl font-mono font-bold tracking-[0.3em] text-white outline-none focus:border-neon-green transition-colors placeholder-white/10 uppercase"
            />

            <button
                type="submit"
                disabled={!canJoin}
                className="w-full py-3 bg-neon-green rounded text-black font-bold hover:bg-white transition text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:bg-neon-green disabled:cursor-not-allowed"
            >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />} {t('start.join')}
            </button>

            <NetworkCompatibility compact className="mt-5" />
        </form>
    );
};

const StartScreen = () => {
    const t = useTranslation();
    const { chooseLocal, startHosting } = useNetwork();
    const [isJoining, setIsJoining] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="w-full h-screen bg-[#09090b] text-white overflow-hidden flex flex-col relative font-inter animate-in fade-in duration-700 select-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1f1f23_0%,_#000000_100%)] pointer-events-none" />

            <div className="relative z-10 px-8 py-8 shrink-0">
                <img src={Logo} alt="Logo" className="h-8 drop-shadow-lg" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">
                {isJoining ? (
                    <JoinPanel onBack={() => setIsJoining(false)} />
                ) : (
                    <>
                        <h1 className="font-rajdhani font-bold text-sm text-gray-500 uppercase tracking-[0.4em] mb-10">{t('start.howToPlay')}</h1>
                        <div className="flex flex-wrap justify-center gap-6 w-full">
                            <OptionCard icon={<Monitor size={26} strokeWidth={1.8} />} accent="#39ff14" title={t('start.localTitle')} description={t('start.localDesc')} onClick={chooseLocal} />
                            <OptionCard icon={<Wifi size={26} strokeWidth={1.8} />} accent="#00d4ff" title={t('start.hostTitle')} description={t('start.hostDesc')} onClick={startHosting} />
                            <OptionCard icon={<LogIn size={26} strokeWidth={1.8} />} accent="#d084ff" title={t('start.joinCardTitle')} description={t('start.joinDesc')} onClick={() => setIsJoining(true)} />
                        </div>
                        <NetworkCompatibility className="mt-8" />
                    </>
                )}
            </div>

            <div className="relative z-10 px-8 py-6 flex items-center justify-end gap-4 shrink-0 text-gray-600">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded hover:text-white hover:bg-white/5 transition" title={t('settings.title')}><Settings size={14} /></button>
                <button onClick={toggleFullscreen} className="p-2 rounded hover:text-white hover:bg-white/5 transition" title={t('mainMenu.fullscreen')}><Maximize size={14} /></button>
                <button onClick={quitApp} className="p-2 rounded hover:text-red-500 hover:bg-red-500/10 transition" title={t('mainMenu.quit')}><LogOut size={14} /></button>
            </div>

            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
        </div>
    );
};

export default StartScreen;
