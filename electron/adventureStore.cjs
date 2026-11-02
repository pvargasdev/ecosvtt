// Biblioteca de aventuras: o menu do programa guarda apenas "ponteiros" para os
// arquivos .ecosvtt (caminho + resumo para exibir o card). A aventura em si vive
// inteira no arquivo, que pode ser movido, copiado ou enviado para outro computador.
//
// Imagens e áudios extraídos dos arquivos ficam num cache em %APPDATA% (por ID,
// que nunca muda), para abrir uma aventura já vista ser instantâneo. O cache pode
// ser apagado sem perda: tudo continua dentro dos arquivos .ecosvtt.

const { dialog, shell, ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ecosvtt = require('./ecosvttFile.cjs');

const EXTENSION = 'ecosvtt';
const COMPACT_MIN_DEAD_BYTES = 32 * 1024 * 1024;
const COMPACT_DEAD_RATIO = 0.35;

let paths = null;          // { userData, images, audio, audioLibrary, library, appState, journal }
const fileStates = new Map(); // caminho -> estado do arquivo (índice, cauda, espaço morto)
const saveQueues = new Map(); // caminho -> Promise (gravações em série por arquivo)

// --- utilidades ------------------------------------------------------------
const readJson = (file, fallback) => {
    try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* corrompido */ }
    return fallback;
};

const writeJsonAtomic = (file, data) => {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
};

const normalizePath = (p) => path.resolve(p).toLowerCase();
const samePath = (a, b) => normalizePath(a) === normalizePath(b);

const sanitizeFileName = (name) => (name || 'Aventura').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Aventura';

const uniquePath = (dir, base) => {
    let candidate = path.join(dir, `${base}.${EXTENSION}`);
    let i = 2;
    while (fs.existsSync(candidate)) candidate = path.join(dir, `${base} (${i++}).${EXTENSION}`);
    return candidate;
};

const loadLibrary = () => readJson(paths.library, { entries: [] });
const saveLibrary = (lib) => writeJsonAtomic(paths.library, lib);
const loadAppState = () => readJson(paths.appState, {});
const saveAppState = (state) => writeJsonAtomic(paths.appState, state);

const defaultDir = () => {
    const last = loadAppState().lastAdventureDir;
    return last && fs.existsSync(last) ? last : require('electron').app.getPath('documents');
};

const rememberDir = (filePath) => {
    const state = loadAppState();
    state.lastAdventureDir = path.dirname(filePath);
    saveAppState(state);
};

// --- assets ----------------------------------------------------------------
const collectAssetIds = (adv) => {
    const images = new Set();
    const audio = new Set();
    if (adv.coverImageId) images.add(adv.coverImageId);
    (adv.scenes || []).forEach(s => {
        if (s.mapImageId) images.add(s.mapImageId);
        if (s.mapThumbnailId) images.add(s.mapThumbnailId);
        (s.tokens || []).forEach(t => { if (t.imageId) images.add(t.imageId); });
    });
    (adv.tokenLibrary || []).forEach(t => { if (t.imageId) images.add(t.imageId); });
    const sb = adv.soundboard || {};
    (sb.playlists || []).forEach(pl => (pl.tracks || []).forEach(t => { if (t.fileId) audio.add(t.fileId); }));
    (sb.sfxGrid || []).forEach(s => { if (s.fileId) audio.add(s.fileId); });
    if (sb.activeTrack?.fileId) audio.add(sb.activeTrack.fileId);
    return { images, audio };
};

const safeId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);
const imagePath = (id) => path.join(paths.images, id);
const audioPath = (id) => path.join(paths.audio, id);

const readAudioLibrary = () => readJson(paths.audioLibrary, []);

const buildAudioManifest = (audioIds, previous = {}) => {
    const lib = readAudioLibrary();
    const manifest = {};
    audioIds.forEach(id => {
        const meta = lib.find(m => m.id === id);
        if (meta) manifest[id] = { name: meta.name, category: meta.category || 'music' };
        else if (previous[id]) manifest[id] = previous[id];
    });
    return manifest;
};

// Extrai para o cache o que ainda não está lá (abrir pela segunda vez é instantâneo).
const extractMissingAssets = (filePath, info) => {
    const missing = info.assets.filter(e => {
        const [kind, id] = e.name.split('/');
        if (!safeId(id)) return false;
        if (kind === 'images') return !fs.existsSync(imagePath(id));
        if (kind === 'audio') return !fs.existsSync(audioPath(id));
        return false;
    });
    if (!missing.length) return;
    const audioLib = readAudioLibrary();
    let audioLibChanged = false;
    ecosvtt.extractEntries(filePath, missing, (entry, data) => {
        const [kind, id] = entry.name.split('/');
        if (kind === 'images') fs.writeFileSync(imagePath(id), data);
        else {
            fs.writeFileSync(audioPath(id), data);
            if (!audioLib.some(m => m.id === id)) {
                const meta = info.audioManifest[id] || {};
                audioLib.push({ id, name: meta.name || `Audio ${id.slice(0, 8)}`, category: meta.category || 'music', date: Date.now(), size: data.length });
                audioLibChanged = true;
            }
        }
    });
    if (audioLibChanged) writeJsonAtomic(paths.audioLibrary, audioLib);
};

// --- diário de gravação ------------------------------------------------------
const journalFor = (filePath) => {
    const file = path.join(paths.journal, `${crypto.createHash('sha1').update(normalizePath(filePath)).digest('hex')}.json`);
    return {
        write: (data) => fs.writeFileSync(file, JSON.stringify(data), 'utf8'),
        clear: () => { try { fs.unlinkSync(file); } catch { /* já removido */ } }
    };
};

const recoverJournals = () => {
    if (!fs.existsSync(paths.journal)) return;
    fs.readdirSync(paths.journal).forEach(name => {
        const file = path.join(paths.journal, name);
        try {
            ecosvtt.recoverFromJournal(JSON.parse(fs.readFileSync(file, 'utf8')));
            console.log('Gravação interrompida recuperada:', name);
        } catch (e) {
            console.error('Falha ao recuperar gravação:', e);
        }
        try { fs.unlinkSync(file); } catch { /* ignora */ }
    });
};

// --- entradas da biblioteca ------------------------------------------------
const summarize = (adventure) => ({
    adventureId: adventure.id,
    name: adventure.name,
    coverImageId: adventure.coverImageId || null,
    sceneCount: (adventure.scenes || []).filter(s => s.type !== 'folder').length,
    updatedAt: Date.now()
});

const upsertEntry = (filePath, adventure, extra = {}) => {
    const lib = loadLibrary();
    let entry = lib.entries.find(e => samePath(e.path, filePath));
    if (entry) Object.assign(entry, summarize(adventure), extra, { path: filePath });
    else {
        entry = { id: crypto.randomUUID(), path: filePath, ...summarize(adventure), createdAt: Date.now(), ...extra };
        lib.entries.push(entry);
    }
    saveLibrary(lib);
    return entry;
};

const withStatus = (entry) => ({ ...entry, missing: !fs.existsSync(entry.path) });

const getEntry = (entryId) => loadLibrary().entries.find(e => e.id === entryId);

// --- gravação ----------------------------------------------------------------
const saveAdventureToFile = (filePath, adventure) => {
    let state = fileStates.get(normalizePath(filePath));
    if (!state) {
        const info = ecosvtt.inspect(filePath);
        state = { ...info, audioManifest: info.audioManifest };
    }
    const { images, audio } = collectAssetIds(adventure);
    const wanted = [...[...images].map(id => `images/${id}`), ...[...audio].map(id => `audio/${id}`)];
    const present = new Map(state.assets.map(e => [e.name, e]));
    const cachePathOf = (name) => {
        const [kind, id] = name.split('/');
        if (!safeId(id)) return null;
        return kind === 'images' ? imagePath(id) : audioPath(id);
    };
    const audioManifest = buildAudioManifest(audio, state.audioManifest);

    const deadRatio = state.fileSize ? state.deadBytes / state.fileSize : 0;
    const needsCompaction = state.deadBytes > COMPACT_MIN_DEAD_BYTES && deadRatio > COMPACT_DEAD_RATIO;

    let result;
    if (!state.incremental || needsCompaction) {
        const sources = wanted.map(name => (present.has(name)
            ? { name, fromFile: { path: filePath, entry: present.get(name) } }
            : { name, fromPath: cachePathOf(name) }));
        result = ecosvtt.writeFull(filePath, sources, adventure, audioManifest);
    } else {
        const keepNames = new Set(wanted.filter(n => present.has(n)));
        const newSources = wanted.filter(n => !present.has(n)).map(name => ({ name, fromPath: cachePathOf(name) })).filter(s => s.fromPath);
        result = ecosvtt.writeIncremental(filePath, state, newSources, adventure, audioManifest, keepNames, journalFor(filePath));
    }
    const fileSize = fs.statSync(filePath).size;
    fileStates.set(normalizePath(filePath), { assets: result.assets, tailOffset: result.tailOffset, deadBytes: result.deadBytes, incremental: true, fileSize, audioManifest });
};

const queueSave = (filePath, fn) => {
    const key = normalizePath(filePath);
    const prev = saveQueues.get(key) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    saveQueues.set(key, next);
    return next;
};

// Cria um arquivo novo a partir de uma aventura (assets vindos do cache ou de outro arquivo).
const createFile = (targetPath, adventure, sourceFile = null) => {
    const { images, audio } = collectAssetIds(adventure);
    let sourceAssets = new Map();
    let previousManifest = {};
    if (sourceFile && fs.existsSync(sourceFile)) {
        const info = ecosvtt.inspect(sourceFile);
        sourceAssets = new Map(info.assets.map(e => [e.name, e]));
        previousManifest = info.audioManifest;
    }
    const names = [...[...images].map(id => `images/${id}`), ...[...audio].map(id => `audio/${id}`)];
    const sources = names.map(name => {
        if (sourceAssets.has(name)) return { name, fromFile: { path: sourceFile, entry: sourceAssets.get(name) } };
        const [kind, id] = name.split('/');
        return { name, fromPath: kind === 'images' ? imagePath(id) : audioPath(id) };
    });
    const result = ecosvtt.writeFull(targetPath, sources, adventure, buildAudioManifest(audio, previousManifest));
    fileStates.set(normalizePath(targetPath), { ...result, incremental: true, fileSize: fs.statSync(targetPath).size, audioManifest: buildAudioManifest(audio, previousManifest) });
};

const askSavePath = async (win, suggestedName) => {
    const res = await dialog.showSaveDialog(win, {
        defaultPath: uniquePath(defaultDir(), sanitizeFileName(suggestedName)),
        filters: [{ name: 'ECOS VTT', extensions: [EXTENSION] }]
    });
    if (res.canceled || !res.filePath) return null;
    let filePath = res.filePath;
    if (!filePath.toLowerCase().endsWith(`.${EXTENSION}`)) filePath += `.${EXTENSION}`;
    rememberDir(filePath);
    return filePath;
};

// Lê um arquivo e prepara a aventura (extraindo assets para o cache).
const loadFile = (filePath) => {
    const info = ecosvtt.inspect(filePath);
    extractMissingAssets(filePath, info);
    fileStates.set(normalizePath(filePath), { ...info });
    return info;
};

// ZIP do antigo "Exportar": vira um .ecosvtt novo (com novo ID, como a importação antiga fazia).
const importLegacyZip = async (win, zipPath) => {
    const info = ecosvtt.inspect(zipPath);
    extractMissingAssets(zipPath, info);
    const adventure = {
        ...info.adventure,
        id: crypto.randomUUID(),
        scenes: (info.adventure.scenes || []).map(s => ({ ...s, fogOfWar: s.fogOfWar || [], pins: s.pins || [] }))
    };
    const target = await askSavePath(win, adventure.name);
    if (!target) return null;
    createFile(target, adventure, zipPath);
    return upsertEntry(target, adventure, { lastOpenedAt: Date.now() });
};

const addFileToLibrary = async (win, filePath) => {
    if (filePath.toLowerCase().endsWith('.zip')) return importLegacyZip(win, filePath);
    const info = loadFile(filePath);
    return upsertEntry(filePath, info.adventure);
};

// --- IPC ---------------------------------------------------------------------
const register = (dataPaths, { getPendingFiles }) => {
    paths = dataPaths;
    [paths.images, paths.audio, paths.journal].forEach(d => fs.mkdirSync(d, { recursive: true }));
    recoverJournals();

    const winOf = (event) => BrowserWindow.fromWebContents(event.sender);
    const errorResult = (e) => ({ error: e.code === 'ENOENT' ? 'missing' : 'invalid', message: e.message });

    ipcMain.handle('adv:list', () => {
        const lib = loadLibrary();
        const notice = lib.migrationNotice || null;
        if (notice) { delete lib.migrationNotice; saveLibrary(lib); }
        return { entries: lib.entries.map(withStatus), notice, pendingFiles: getPendingFiles() };
    });

    ipcMain.handle('adv:create', async (event, adventure) => {
        const target = await askSavePath(winOf(event), adventure.name);
        if (!target) return null;
        createFile(target, adventure);
        return withStatus(upsertEntry(target, adventure));
    });

    ipcMain.handle('adv:open', (event, entryId) => {
        const entry = getEntry(entryId);
        if (!entry) return { error: 'missing' };
        if (!fs.existsSync(entry.path)) return { error: 'missing' };
        try {
            const info = loadFile(entry.path);
            upsertEntry(entry.path, info.adventure, { lastOpenedAt: Date.now() });
            return { adventure: info.adventure };
        } catch (e) {
            return errorResult(e);
        }
    });

    ipcMain.handle('adv:save', (event, entryId, adventure) => {
        const entry = getEntry(entryId);
        if (!entry) return { error: 'missing' };
        return queueSave(entry.path, () => {
            try {
                saveAdventureToFile(entry.path, adventure);
                upsertEntry(entry.path, adventure);
                return { ok: true };
            } catch (e) {
                console.error('Erro ao salvar aventura:', e);
                return errorResult(e);
            }
        });
    });

    ipcMain.handle('adv:updateMeta', (event, entryId, updates) => {
        const entry = getEntry(entryId);
        if (!entry || !fs.existsSync(entry.path)) return { error: 'missing' };
        return queueSave(entry.path, () => {
            try {
                const info = ecosvtt.inspect(entry.path);
                const adventure = { ...info.adventure, ...updates };
                saveAdventureToFile(entry.path, adventure);
                return withStatus(upsertEntry(entry.path, adventure));
            } catch (e) {
                return errorResult(e);
            }
        });
    });

    ipcMain.handle('adv:relocate', async (event, entryId) => {
        const entry = getEntry(entryId);
        if (!entry) return null;
        const res = await dialog.showOpenDialog(winOf(event), {
            defaultPath: fs.existsSync(path.dirname(entry.path)) ? path.dirname(entry.path) : defaultDir(),
            filters: [{ name: 'ECOS VTT', extensions: [EXTENSION] }],
            properties: ['openFile']
        });
        if (res.canceled || !res.filePaths[0]) return null;
        const newPath = res.filePaths[0];
        try {
            const info = loadFile(newPath);
            const lib = loadLibrary();
            // Se o arquivo escolhido já está em outro card, mantém um só.
            lib.entries = lib.entries.filter(e => e.id === entryId || !samePath(e.path, newPath));
            const target = lib.entries.find(e => e.id === entryId);
            Object.assign(target, summarize(info.adventure), { path: newPath });
            saveLibrary(lib);
            rememberDir(newPath);
            return withStatus(target);
        } catch (e) {
            return errorResult(e);
        }
    });

    ipcMain.handle('adv:openFile', async (event) => {
        const res = await dialog.showOpenDialog(winOf(event), {
            defaultPath: defaultDir(),
            filters: [{ name: 'ECOS VTT', extensions: [EXTENSION, 'zip'] }],
            properties: ['openFile']
        });
        if (res.canceled || !res.filePaths[0]) return null;
        try {
            const entry = await addFileToLibrary(winOf(event), res.filePaths[0]);
            if (entry) rememberDir(entry.path);
            return entry ? withStatus(entry) : null;
        } catch (e) {
            return errorResult(e);
        }
    });

    ipcMain.handle('adv:openPath', async (event, filePath) => {
        try {
            const entry = await addFileToLibrary(winOf(event), filePath);
            return entry ? withStatus(entry) : null;
        } catch (e) {
            return errorResult(e);
        }
    });

    ipcMain.handle('adv:remove', async (event, entryId, moveToTrash) => {
        const lib = loadLibrary();
        const entry = lib.entries.find(e => e.id === entryId);
        if (!entry) return false;
        if (moveToTrash && fs.existsSync(entry.path)) {
            try { await shell.trashItem(entry.path); } catch (e) { console.error(e); }
        }
        lib.entries = lib.entries.filter(e => e.id !== entryId);
        saveLibrary(lib);
        fileStates.delete(normalizePath(entry.path));
        return true;
    });

    ipcMain.handle('adv:duplicate', async (event, entryId, copyName) => {
        const entry = getEntry(entryId);
        if (!entry || !fs.existsSync(entry.path)) return { error: 'missing' };
        try {
            const info = ecosvtt.inspect(entry.path);
            const adventure = { ...info.adventure, id: crypto.randomUUID(), name: copyName || info.adventure.name };
            const target = await askSavePath(winOf(event), adventure.name);
            if (!target) return null;
            createFile(target, adventure, entry.path);
            return withStatus(upsertEntry(target, adventure));
        } catch (e) {
            return errorResult(e);
        }
    });

    ipcMain.handle('adv:saveCopy', async (event, entryId) => {
        const entry = getEntry(entryId);
        if (!entry || !fs.existsSync(entry.path)) return { error: 'missing' };
        const target = await askSavePath(winOf(event), entry.name);
        if (!target) return null;
        if (samePath(target, entry.path)) return { ok: true };
        await (saveQueues.get(normalizePath(entry.path)) || Promise.resolve());
        try {
            const info = ecosvtt.inspect(entry.path);
            createFile(target, info.adventure, entry.path);
            return { ok: true, path: target };
        } catch (e) {
            return errorResult(e);
        }
    });

    ipcMain.handle('adv:showInFolder', (event, entryId) => {
        const entry = getEntry(entryId);
        if (entry && fs.existsSync(entry.path)) shell.showItemInFolder(entry.path);
    });
};

// Espera as gravações pendentes (usado ao fechar o programa).
const flushAll = () => Promise.all([...saveQueues.values()].map(p => p.catch(() => {})));

module.exports = { register, flushAll, createFile, upsertEntry, sanitizeFileName, uniquePath, loadLibrary, saveLibrary, collectAssetIds };
