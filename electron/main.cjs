const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

Menu.setApplicationMenu(null);

const adventureStore = require('./adventureStore.cjs');
const { migrateLegacyData, migrateFromOldAppName } = require('./migration.cjs');

// Dados do usuário ficam em %APPDATA%\EcosVTT (nunca ao lado do .exe), para o
// executável ser um arquivo único e portátil. As aventuras em si ficam em arquivos
// .ecosvtt onde o usuário escolher (por padrão, em Documentos).
const DATA_PATH = app.getPath('userData');
migrateFromOldAppName(DATA_PATH);
fs.mkdirSync(DATA_PATH, { recursive: true });

const DATA_PATHS = {
    userData: DATA_PATH,
    images: path.join(DATA_PATH, 'images'),
    audio: path.join(DATA_PATH, 'audio'),
    audioLibrary: path.join(DATA_PATH, 'audio_library.json'),
    library: path.join(DATA_PATH, 'library.json'),
    appState: path.join(DATA_PATH, 'app_state.json'),
    journal: path.join(DATA_PATH, 'journal')
};

console.log(`✅ Pasta de dados: ${DATA_PATH}`);

ipcMain.handle('read-json', async (event, key) => {
    try {
        const filePath = path.join(DATA_PATH, `${key}.json`);
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { }
    return null;
});

ipcMain.handle('write-json', async (event, key, data) => {
    try {
        const filePath = path.join(DATA_PATH, `${key}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) { return false; }
});

const IMAGES_PATH = DATA_PATHS.images;
try { if (!fs.existsSync(IMAGES_PATH)) fs.mkdirSync(IMAGES_PATH, { recursive: true }); } catch (e) {}

ipcMain.handle('save-image', async (event, id, buffer) => {
    try { fs.writeFileSync(path.join(IMAGES_PATH, id), Buffer.from(buffer)); return true; } catch (e) { return false; }
});
ipcMain.handle('get-image', async (event, id) => {
    try { const p = path.join(IMAGES_PATH, id); if (fs.existsSync(p)) { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } } catch (e) {} return null;
});
ipcMain.handle('delete-image', async (event, id) => {
    try { const p = path.join(IMAGES_PATH, id); if (fs.existsSync(p)) { fs.unlinkSync(p); return true; } } catch (e) {} return false;
});

const AUDIO_PATH = DATA_PATHS.audio;
const AUDIO_LIB_PATH = DATA_PATHS.audioLibrary;

try { if (!fs.existsSync(AUDIO_PATH)) fs.mkdirSync(AUDIO_PATH, { recursive: true }); } catch (e) {}

function getAudioLibrary() {
    try {
        if (fs.existsSync(AUDIO_LIB_PATH)) {
            return JSON.parse(fs.readFileSync(AUDIO_LIB_PATH, 'utf8'));
        }
    } catch (e) {}
    return [];
}

ipcMain.handle('save-audio', async (event, id, buffer, fileName, category) => {
    try {
        fs.writeFileSync(path.join(AUDIO_PATH, id), Buffer.from(buffer));
        
        let lib = getAudioLibrary();
        lib = lib.filter(item => item.id !== id);
        
        lib.push({
            id,
            name: fileName || "Sem Nome",
            category: category || 'music',
            date: Date.now(),
            size: buffer.byteLength
        });

        fs.writeFileSync(AUDIO_LIB_PATH, JSON.stringify(lib, null, 2));
        return true;
    } catch (e) { 
        console.error("Erro save-audio:", e); 
        return false; 
    }
});

ipcMain.handle('get-audio', async (event, id) => {
    try { const p = path.join(AUDIO_PATH, id); if (fs.existsSync(p)) { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } } catch (e) {} return null;
});

ipcMain.handle('delete-audio', async (event, id) => {
    try {
        const p = path.join(AUDIO_PATH, id);
        if (fs.existsSync(p)) fs.unlinkSync(p);
        
        let lib = getAudioLibrary();
        const newLib = lib.filter(item => item.id !== id);
        fs.writeFileSync(AUDIO_LIB_PATH, JSON.stringify(newLib, null, 2));
        
        return true;
    } catch (e) {}
    return false;
});

ipcMain.handle('list-audio', async () => {
    return getAudioLibrary(); 
});

let mainWindow = null;
let gmWindow = null;

// Arquivos .ecosvtt passados ao abrir o programa ("Abrir com", arrastar no ícone).
const isAdventureArg = (a) => typeof a === 'string' && /\.(ecosvtt|zip)$/i.test(a) && fs.existsSync(a);
let pendingFiles = process.argv.slice(1).filter(isAdventureArg);
const takePendingFiles = () => { const files = pendingFiles; pendingFiles = []; return files; };

const gotInstanceLock = app.requestSingleInstanceLock();
if (!gotInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', (event, argv) => {
        const files = argv.slice(1).filter(isAdventureArg);
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            if (files.length) mainWindow.webContents.send('adv:files-opened', files);
        }
    });
}

if (gotInstanceLock) {
    adventureStore.register(DATA_PATHS, { getPendingFiles: takePendingFiles });
    migrateLegacyData(DATA_PATHS, adventureStore);
}

const VITE_DEV_SERVER_URL = 'http://localhost:5173';
const INDEX_PATH = path.join(app.getAppPath(), 'dist/index.html');
const PRELOAD_PATH = path.join(app.getAppPath(), 'electron', 'preload.cjs');

// A janela principal só aparece depois de desenhada. Até lá, o executável portátil
// mantém na tela a imagem de abertura (assets/splash.bmp, ver scripts/build-exe.cjs).
const SHOW_FALLBACK_MS = 20000; // se algo travar, a janela aparece mesmo assim

function revealMainWindow() {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
    mainWindow.show();
    mainWindow.focus();
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800, minWidth: 800, minHeight: 600,
        frame: true, autoHideMenuBar: true, show: false, backgroundColor: '#000000',
        webPreferences: { preload: PRELOAD_PATH, nodeIntegration: false, contextIsolation: true },
    });
    mainWindow.once('ready-to-show', revealMainWindow);
    setTimeout(revealMainWindow, SHOW_FALLBACK_MS);

    if (process.argv[2] === 'electron:start' || process.env.VITE_DEV) mainWindow.loadURL(VITE_DEV_SERVER_URL);
    else mainWindow.loadFile(INDEX_PATH);

    // Antes de fechar, o app termina de salvar a aventura aberta (com limite de tempo).
    let readyToClose = false;
    mainWindow.on('close', (event) => {
        if (readyToClose) return;
        event.preventDefault();
        const finish = () => {
            if (readyToClose) return;
            readyToClose = true;
            adventureStore.flushAll().finally(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close(); });
        };
        ipcMain.once('app:ready-to-close', finish);
        setTimeout(finish, 6000);
        mainWindow.webContents.send('app:before-close');
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (gmWindow) gmWindow.close();
    });
}

function createGMWindow(startAdventureId) {
    if (gmWindow) { gmWindow.focus(); return; }
    gmWindow = new BrowserWindow({
        width: 1000, height: 700, minWidth: 800, minHeight: 600,
        title: "Painel do Mestre - EcosVTT",
        autoHideMenuBar: true,
        webPreferences: { preload: PRELOAD_PATH, nodeIntegration: false, contextIsolation: true },
    });
    const query = `?mode=gm&advId=${startAdventureId || ''}`;
    if (process.argv[2] === 'electron:start' || process.env.VITE_DEV) gmWindow.loadURL(`${VITE_DEV_SERVER_URL}/${query}`);
    else gmWindow.loadFile(INDEX_PATH, { search: query });

    if (mainWindow) mainWindow.webContents.send('gm-window-status', true);
    gmWindow.on('closed', () => {
        gmWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('gm-window-status', false);
    });
}

ipcMain.handle('open-gm-window', (event, advId) => createGMWindow(advId));
ipcMain.handle('app:quit', () => { if (mainWindow) mainWindow.close(); else app.quit(); });

ipcMain.on('app-sync', (event, arg) => {
    if (mainWindow && event.sender.id === mainWindow.webContents.id && gmWindow && !gmWindow.isDestroyed()) {
        gmWindow.webContents.send('app-sync-receive', arg);
    }
    if (gmWindow && event.sender.id === gmWindow.webContents.id && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app-sync-receive', arg);
    }
});

app.on('ready', () => {
    if (!gotInstanceLock) return;
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });