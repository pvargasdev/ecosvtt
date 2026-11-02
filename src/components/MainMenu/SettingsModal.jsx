import React, { useEffect } from 'react';
import { Settings, Languages, Check, X } from 'lucide-react';
import { useI18n, SYSTEM_PREFERENCE } from '../../i18n';

const LanguageOption = ({ label, sublabel, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
            isActive
                ? 'border-neon-green/60 bg-neon-green/10 text-white'
                : 'border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:border-white/15 hover:bg-white/5'
        }`}
    >
        <span className="flex flex-col">
            <span className="font-rajdhani font-bold text-sm tracking-wide">{label}</span>
            {sublabel && <span className="text-[10px] text-gray-500 uppercase tracking-wider">{sublabel}</span>}
        </span>
        {isActive && <Check size={16} className="text-neon-green shrink-0" />}
    </button>
);

const SettingsModal = ({ onClose }) => {
    const { t, preference, setLanguage, languages, systemLanguage } = useI18n();
    const systemLanguageName = languages.find(l => l.code === systemLanguage)?.name || systemLanguage;

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={onClose}>
            <div className="bg-[#121214] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onMouseDown={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-rajdhani font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Settings size={18} className="text-neon-green" /> {t('settings.title')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition" title={t('common.close')}>
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                        <Languages size={12} /> {t('settings.language')}
                    </div>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
                        <LanguageOption
                            label={t('settings.languageSystem')}
                            sublabel={systemLanguageName}
                            isActive={preference === SYSTEM_PREFERENCE}
                            onClick={() => setLanguage(SYSTEM_PREFERENCE)}
                        />
                        {languages.map(lang => (
                            <LanguageOption
                                key={lang.code}
                                label={lang.name}
                                isActive={preference === lang.code}
                                onClick={() => setLanguage(lang.code)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
