import { createContext, useContext } from 'react';

export const I18nContext = createContext(null);

export const useI18n = () => useContext(I18nContext);
export const useTranslation = () => useContext(I18nContext).t;

export { translate, getCurrentLanguage, SYSTEM_PREFERENCE, SUPPORTED_LANGUAGES } from './core';
