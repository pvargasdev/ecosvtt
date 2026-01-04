const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

Menu.setApplicationMenu(null);

let BASE_PATH;
let DATA_PATH;

try {
    if (app.isPackaged) {
        BASE_PATH = path.dirname(app.getPath('exe'));
    } else {
        BASE_PATH = app.getAppPath();
    }
    if (BASE_PATH.includes('app.asar')) throw new Error("Caminho ASAR detectado.");
    
    DATA_PATH = path.join(BASE_PATH, 'ecos_data');
    if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH, { recursive: true });
} catch (error) {
    DATA_PATH = path.join(app.getPath('userData'), 'ecos_data');
    if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH, { recursive: true });
}

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

const IMAGES_PATH = path.join(DATA_PATH, 'images');
try { if (!fs.existsSync(IMAGES_PATH)) fs.mkdirSync(IMAGES_PATH, { recursive: true }); } catch (e) {}

ipcMain.handle('save-image', async (event, id, buffer) => {
    try { fs.writeFileSync(path.join(IMAGES_PATH, id), Buffer.from(buffer)); return true; } catch (e) { return false; }
});
ipcMain.handle('get-image', async (event, id) => {
    try { const p = path.join(IMAGES_PATH, id); if (fs.existsSync(p)) return fs.readFileSync(p).buffer; } catch (e) {} return null;
});
ipcMain.handle('delete-image', async (event, id) => {
    try { const p = path.join(IMAGES_PATH, id); if (fs.existsSync(p)) { fs.unlinkSync(p); return true; } } catch (e) {} return false;
});

const AUDIO_PATH = path.join(DATA_PATH, 'audio');
const AUDIO_LIB_PATH = path.join(DATA_PATH, 'audio_library.json');

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
    try { const p = path.join(AUDIO_PATH, id); if (fs.existsSync(p)) return fs.readFileSync(p).buffer; } catch (e) {} return null;
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

const VITE_DEV_SERVER_URL = 'http://localhost:5173';
const INDEX_PATH = path.join(app.getAppPath(), 'dist/index.html');
const PRELOAD_PATH = path.join(app.getAppPath(), 'electron', 'preload.cjs');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800, minWidth: 800, minHeight: 600,
        frame: true, autoHideMenuBar: true,
        webPreferences: { preload: PRELOAD_PATH, nodeIntegration: false, contextIsolation: true },
    });

    if (process.argv[2] === 'electron:start' || process.env.VITE_DEV) mainWindow.loadURL(VITE_DEV_SERVER_URL);
    else mainWindow.loadFile(INDEX_PATH);

    mainWindow.on('closed', () => { mainWindow = null; if (gmWindow) gmWindow.close(); });
}

function createGMWindow(startAdventureId) {
    if (gmWindow) { gmWindow.focus(); return; }
    gmWindow = new BrowserWindow({
        width: 1000, height: 700, minWidth: 800, minHeight: 600,
        title: "Painel do Mestre - Ecos VTT",
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

ipcMain.on('app-sync', (event, arg) => {
    if (mainWindow && event.sender.id === mainWindow.webContents.id && gmWindow && !gmWindow.isDestroyed()) {
        gmWindow.webContents.send('app-sync-receive', arg);
    }
    if (gmWindow && event.sender.id === gmWindow.webContents.id && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app-sync-receive', arg);
    }
});

app.on('ready', () => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });