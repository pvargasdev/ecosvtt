import translationsCsv from './translations.csv?raw';

// O CSV é embutido no bundle em tempo de build (import ?raw), então não fica
// exposto como arquivo para o usuário. Formato: key,<idioma1>,<idioma2>,...
// Para adicionar um idioma basta criar uma nova coluna com o código (ex: "es")
// e preencher a linha "_meta.languageName" com o nome do idioma.

const FALLBACK_LANGUAGE = 'en';
export const STORAGE_KEY = 'ecos_language';
export const SYSTEM_PREFERENCE = 'system';

const parseCsv = (text) => {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') inQuotes = false;
            else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(field); rows.push(row); row = []; field = '';
        } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(cell => cell.trim() !== ''));
};

const buildDictionaries = (text) => {
    const [header, ...rows] = parseCsv(text.replace(/^\uFEFF/, ''));
    const languages = header.slice(1).map(l => l.trim()).filter(Boolean);
    const dicts = Object.fromEntries(languages.map(l => [l, {}]));
    rows.forEach(([key, ...values]) => {
        const k = key?.trim();
        if (!k || k.startsWith('#')) return;
        languages.forEach((lang, i) => { if (values[i]) dicts[lang][k] = values[i]; });
    });
    return { languages, dicts };
};

const { languages: LANGUAGE_CODES, dicts: DICTIONARIES } = buildDictionaries(translationsCsv);

export const SUPPORTED_LANGUAGES = LANGUAGE_CODES.map(code => ({
    code,
    name: DICTIONARIES[code]['_meta.languageName'] || code
}));

// Casa o idioma do sistema com as colunas do CSV: primeiro exato (pt-BR), depois pela base (pt).
export const matchLanguage = (candidate) => {
    if (!candidate) return null;
    const lower = candidate.toLowerCase();
    const exact = LANGUAGE_CODES.find(c => c.toLowerCase() === lower);
    if (exact) return exact;
    const base = lower.split('-')[0];
    return LANGUAGE_CODES.find(c => c.toLowerCase().split('-')[0] === base) || null;
};

export const detectSystemLanguage = () => {
    const candidates = typeof navigator !== 'undefined' ? [...(navigator.languages || []), navigator.language] : [];
    for (const c of candidates) {
        const match = matchLanguage(c);
        if (match) return match;
    }
    return matchLanguage(FALLBACK_LANGUAGE) || LANGUAGE_CODES[0];
};

// Preferência salva: um código de idioma ou ausente (= seguir o idioma do sistema).
export const readStoredPreference = () => {
    try { return matchLanguage(localStorage.getItem(STORAGE_KEY)) || SYSTEM_PREFERENCE; } catch { return SYSTEM_PREFERENCE; }
};

export const resolveLanguage = (preference) => (preference === SYSTEM_PREFERENCE ? detectSystemLanguage() : preference);

let currentLanguage = resolveLanguage(readStoredPreference());

const interpolate = (str, params) => params
    ? str.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? params[name] : m))
    : str;

const lookup = (language, key) => DICTIONARIES[language]?.[key] ?? DICTIONARIES[FALLBACK_LANGUAGE]?.[key];

// Plural: com o parâmetro `count`, procura primeiro "<chave>_<categoria>" (one, other, few...)
// conforme as regras do idioma, e cai para a chave base se a variante não existir.
export const translateTo = (language, key, params) => {
    let str;
    if (typeof params?.count === 'number') {
        const category = new Intl.PluralRules(language).select(params.count);
        str = lookup(language, `${key}_${category}`);
    }
    str = str ?? lookup(language, key) ?? key;
    return interpolate(str, params);
};

// Versão sem hook, para código fora de componentes (ex: nomes padrão no GameContext).
export const translate = (key, params) => translateTo(currentLanguage, key, params);

export const getCurrentLanguage = () => currentLanguage;

// Chamado pelo provider quando o idioma muda (fora do render).
export const setCurrentLanguage = (language) => { currentLanguage = language; };

