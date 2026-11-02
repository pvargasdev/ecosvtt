// Verifica o arquivo de traduções: chaves usadas no código que faltam no CSV,
// células vazias por idioma, chaves duplicadas e chaves que não são mais usadas.
// Uso: npm run i18n:check
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CSV_PATH = path.join(ROOT, 'src', 'i18n', 'translations.csv');

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

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.(jsx?|tsx?)$/.test(e.name) ? [full] : [];
});

const [header, ...rows] = parseCsv(fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, ''));
const languages = header.slice(1).map(l => l.trim());
const csvKeys = new Map();
const problems = [];

rows.forEach(([key, ...values], index) => {
    const k = key.trim();
    if (!k || k.startsWith('#')) return;
    if (csvKeys.has(k)) problems.push(`Chave duplicada: ${k} (linha ${index + 2})`);
    csvKeys.set(k, values);
    languages.forEach((lang, i) => {
        if (!values[i] || !values[i].trim()) problems.push(`Sem tradução [${lang}]: ${k}`);
    });
});

const usedKeys = new Map();
const usedPrefixes = new Set();
const KEY_REGEX = /\b(?:t|translate)\(\s*['"`]([\w.-]+)['"`]/g;
// Chaves montadas dinamicamente, ex: t(`network.errors.${code}`)
const PREFIX_REGEX = /\b(?:t|translate)\(\s*`([\w.-]+)\$\{/g;
for (const file of walk(path.join(ROOT, 'src'))) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(KEY_REGEX)) {
        if (!usedKeys.has(m[1])) usedKeys.set(m[1], path.relative(ROOT, file));
    }
    for (const m of content.matchAll(PREFIX_REGEX)) usedPrefixes.add(m[1]);
}

for (const [key, file] of usedKeys) {
    if (!csvKeys.has(key)) problems.push(`Chave ausente no CSV: ${key} (usada em ${file})`);
}

// Variantes de plural (chave_one, chave_other...) contam como usadas junto com a chave base.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const unused = [...csvKeys.keys()].filter(k => !k.startsWith('_meta.') && !usedKeys.has(k) && !usedKeys.has(k.replace(PLURAL_SUFFIX, '')) && ![...usedPrefixes].some(p => k.startsWith(p)));

console.log(`Idiomas: ${languages.join(', ')} | chaves no CSV: ${csvKeys.size} | chaves usadas: ${usedKeys.size}`);
if (unused.length) console.log(`\nChaves não usadas no código (${unused.length}):\n  ${unused.join('\n  ')}`);
if (problems.length) {
    console.log(`\nProblemas (${problems.length}):\n  ${problems.join('\n  ')}`);
    process.exit(1);
}
console.log('\nOK: todas as chaves usadas existem e estão traduzidas.');
