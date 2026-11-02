import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { I18nContext } from './index';
import {
    STORAGE_KEY, SYSTEM_PREFERENCE, SUPPORTED_LANGUAGES,
    matchLanguage, detectSystemLanguage, readStoredPreference, resolveLanguage,
    translateTo, setCurrentLanguage
} from './core';

const I18nProvider = ({ children }) => {
    const [preference, setPreference] = useState(readStoredPreference);
    const language = resolveLanguage(preference);

    const setLanguage = useCallback((code) => {
        const next = code === SYSTEM_PREFERENCE ? SYSTEM_PREFERENCE : matchLanguage(code);
        if (!next) return;
        try {
            if (next === SYSTEM_PREFERENCE) localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, next);
        } catch { /* armazenamento indisponível */ }
        setCurrentLanguage(resolveLanguage(next));
        setPreference(next);
    }, []);

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    // Mantém a Janela do Mestre sincronizada quando o idioma muda na janela principal.
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key !== STORAGE_KEY) return;
            const next = matchLanguage(e.newValue) || SYSTEM_PREFERENCE;
            setCurrentLanguage(resolveLanguage(next));
            setPreference(next);
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const t = useCallback((key, params) => translateTo(language, key, params), [language]);

    const value = useMemo(() => ({
        language, preference, setLanguage, t,
        languages: SUPPORTED_LANGUAGES,
        systemLanguage: detectSystemLanguage()
    }), [language, preference, setLanguage, t]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export default I18nProvider;
