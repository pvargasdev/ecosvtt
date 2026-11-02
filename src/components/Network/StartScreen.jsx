import React, { useState, useEffect } from 'react';
import { Monitor, Wifi, LogIn, ArrowLeft, ArrowRight, Settings, Maximize, LogOut, Loader2 } from 'lucide-react';
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

const APP_VERSION = 'v1.1.0';

const quitApp = () => {
    if (window.electron?.quit) window.electron.quit();
    else window.close();
};

// Card de modo de jogo. A parte de baixo tem altura fixa (título numa linha e
// descrição em até 3 linhas), então o título fica sempre na mesma posição,
// independente do tamanho do texto em cada idioma.
const OptionCard = ({ index, icon, tag, title, description, accent, onClick }) => {
    const t = useTranslation();
    return (
        <button
            onClick={onClick}
            className="group relative w-[272px] h-[360px] shrink-0 rounded-2xl border border-white/[0.06] bg-[#0d0d10] text-left overflow-hidden transition-all duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2"
            style={{ '--tw-ring-color': accent }}
        >
            {/* brilho de fundo na cor do modo */}
            <div
                className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-[0.07] group-hover:opacity-[0.18] transition-opacity duration-500 pointer-events-none"
                style={{ background: accent }}
            />
            {/* borda e linha superior na cor do modo, ao passar o mouse */}
            <div className="absolute inset-0 rounded-2xl border opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ borderColor: `${accent}55`, boxShadow: `0 20px 50px -20px ${accent}40` }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-full transition-all duration-500" style={{ background: accent }} />

            <div className="relative h-full flex flex-col p-6">
                <div className="flex items-center justify-between h-6">
                    <span className="w-6 h-6 rounded-md border border-white/10 bg-black/40 flex items-center justify-center text-[10px] font-mono font-bold text-gray-500 group-hover:text-white transition-colors" title={t('start.shortcutHint', { key: index })}>
                        {index}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-full border" style={{ color: accent, borderColor: `${accent}40`, background: `${accent}0d` }}>
                        {tag}
                    </span>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" style={{ background: accent }} />
                        <div
                            className="relative w-20 h-20 rounded-full border border-white/10 bg-black/50 flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                            style={{ color: accent }}
                        >
                            {icon}
                        </div>
                    </div>
                </div>

                <div className="h-[118px] flex flex-col">
                    <h2 className="h-8 font-rajdhani font-bold text-[22px] leading-8 text-white uppercase tracking-wider truncate">{title}</h2>
                    <p className="h-[54px] mt-1 text-xs text-gray-500 leading-[18px] line-clamp-3 group-hover:text-gray-300 transition-colors">{description}</p>
                    <span className="mt-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" style={{ color: accent }}>
                        {t('start.choose')} <ArrowRight size={12} />
                    </span>
                </div>
            </div>
        </button>
    );
};

const JOIN_ACCENT = '#d084ff';

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

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onBack(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onBack]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canJoin) return;
        setIsSubmitting(true);
        joinRoom(normalized, name);
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md bg-[#0d0d10] border border-white/[0.06] rounded-2xl shadow-2xl p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-[0.12] pointer-events-none" style={{ background: JOIN_ACCENT }} />
            <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: JOIN_ACCENT }} />
            <button type="button" onClick={onBack} className="relative flex items-center gap-2 text-xs text-gray-500 hover:text-white transition mb-6 uppercase tracking-wider font-bold">
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

    // Atalhos 1, 2 e 3 para escolher o modo.
    useEffect(() => {
        if (isJoining || isSettingsOpen) return;
        const onKey = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
            const actions = { 1: chooseLocal, 2: startHosting, 3: () => setIsJoining(true) };
            if (!actions[e.key]) return;
            // Evita que a tecla do atalho seja digitada no campo que recebe o foco em seguida.
            e.preventDefault();
            actions[e.key]();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isJoining, isSettingsOpen, chooseLocal, startHosting]);

    return (
        <div className="w-full h-screen bg-[#09090b] text-white overflow-hidden flex flex-col relative font-inter animate-in fade-in duration-700 select-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1f1f23_0%,_#000000_100%)] pointer-events-none" />
            <div
                className="absolute inset-0 opacity-[0.15] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)'
                }}
            />

            <div className="relative z-10 px-8 pt-8 pb-2 shrink-0">
                <img src={Logo} alt="Logo" className="h-8 drop-shadow-lg" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto scrollbar-thin">
                {isJoining ? (
                    <JoinPanel onBack={() => setIsJoining(false)} />
                ) : (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-neon-green/70 mb-3">{t('start.eyebrow')}</span>
                        <h1 className="font-rajdhani font-bold text-3xl text-white uppercase tracking-[0.25em] mb-10 text-center">{t('start.howToPlay')}</h1>
                        <div className="flex flex-wrap justify-center gap-6">
                            <OptionCard index={1} icon={<Monitor size={30} strokeWidth={1.6} />} accent="#39ff14" tag={t('start.tags.local')} title={t('start.localTitle')} description={t('start.localDesc')} onClick={chooseLocal} />
                            <OptionCard index={2} icon={<Wifi size={30} strokeWidth={1.6} />} accent="#00d4ff" tag={t('start.tags.host')} title={t('start.hostTitle')} description={t('start.hostDesc')} onClick={startHosting} />
                            <OptionCard index={3} icon={<LogIn size={30} strokeWidth={1.6} />} accent="#d084ff" tag={t('start.tags.join')} title={t('start.joinCardTitle')} description={t('start.joinDesc')} onClick={() => setIsJoining(true)} />
                        </div>
                        <div className="h-12 flex items-start justify-center mt-6">
                            <NetworkCompatibility />
                        </div>
                    </div>
                )}
            </div>

            <div className="relative z-10 px-8 py-6 flex items-center justify-between shrink-0 text-gray-600">
                <span className="text-[10px] font-mono uppercase tracking-widest">{APP_VERSION}</span>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded hover:text-white hover:bg-white/5 transition" title={t('settings.title')}><Settings size={14} /></button>
                    <button onClick={toggleFullscreen} className="p-2 rounded hover:text-white hover:bg-white/5 transition" title={t('mainMenu.fullscreen')}><Maximize size={14} /></button>
                    <button onClick={quitApp} className="p-2 rounded hover:text-red-500 hover:bg-red-500/10 transition" title={t('mainMenu.quit')}><LogOut size={14} /></button>
                </div>
            </div>

            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
        </div>
    );
};

export default StartScreen;
