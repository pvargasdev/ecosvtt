// electron/main.cjs
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

Menu.setApplicationMenu(null); 

// --- CONFIGURAÇÃO DE PATHS (Blindada) ---
let BASE_PATH;
let DATA_PATH;

// Definimos os caminhos, mas NÃO criamos pastas ainda para não travar o script
try {
    if (app.isPackaged) {
        BASE_PATH = path.dirname(app.getPath('exe'));
    } else {
        BASE_PATH = app.getAppPath();
    }
    // Proteção contra ASAR
    if (BASE_PATH.includes('app.asar')) throw new Error("ASAR detectado");
    DATA_PATH = path.join(BASE_PATH, 'ecos_data');
} catch (error) {
    DATA_PATH = path.join(app.getPath('userData'), 'ecos_data');
}

// Função auxiliar segura para criar pastas
const ensureDir = (dir) => {
    try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } 
    catch (e) { console.error(`Erro criando pasta ${dir}:`, e); }
};

// Garante pastas agora (mas sem travar execução global se falhar)
ensureDir(DATA_PATH);
const IMAGES_PATH = path.join(DATA_PATH, 'images');
ensureDir(IMAGES_PATH);


// --- FUNÇÕES DE ARQUIVO (JSON) ---
ipcMain.handle('read-json', async (event, key) => {
    try {
        const filePath = path.join(DATA_PATH, `${key}.json`);
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { return null; }
    return null;
});

ipcMain.handle('write-json', async (event, key, data) => {
    try {
        fs.writeFileSync(path.join(DATA_PATH, `${key}.json`), JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) { return false; }
});

// --- FUNÇÕES DE ARQUIVO (IMAGENS) ---
ipcMain.handle('save-image', async (event, id, buffer) => {
    try { fs.writeFileSync(path.join(IMAGES_PATH, id), Buffer.from(buffer)); return true; } 
    catch (e) { return false; }
});

ipcMain.handle('get-image', async (event, id) => {
    try {
        const p = path.join(IMAGES_PATH, id);
        if (fs.existsSync(p)) return fs.readFileSync(p).buffer;
    } catch (e) {}
    return null;
});

ipcMain.handle('delete-image', async (event, id) => {
    try {
        const p = path.join(IMAGES_PATH, id);
        if (fs.existsSync(p)) { fs.unlinkSync(p); return true; }
    } catch (e) {}
    return false;
});


// --- GERENCIAMENTO DE JANELAS ---
let mainWindow = null;
let gmWindow = null;

const VITE_DEV_SERVER_URL = 'http://localhost:5173';
const INDEX_PATH = path.join(app.getAppPath(), 'dist/index.html');
// Definindo PRELOAD de forma robusta
const PRELOAD_PATH = path.join(app.getAppPath(), 'electron', 'preload.cjs');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800, minWidth: 800, minHeight: 600,
        frame: true, autoHideMenuBar: true,
        webPreferences: {
            preload: PRELOAD_PATH,
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (process.argv[2] === 'electron:start' || process.env.VITE_DEV) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL);
        // mainWindow.webContents.openDevTools(); 
    } else {
        mainWindow.loadFile(INDEX_PATH);
    }
}

function createGMWindow(startAdventureId) {
    if (gmWindow) {
        gmWindow.focus();
        return;
    }

    gmWindow = new BrowserWindow({
        width: 1000, height: 700, minWidth: 800, minHeight: 600,
        title: "Painel do Mestre - Ecos VTT",
        autoHideMenuBar: true,
        webPreferences: {
            preload: PRELOAD_PATH,
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const query = `?mode=gm&advId=${startAdventureId || ''}`;

    if (process.argv[2] === 'electron:start' || process.env.VITE_DEV) {
        gmWindow.loadURL(`${VITE_DEV_SERVER_URL}/${query}`);
    } else {
        gmWindow.loadFile(INDEX_PATH, { search: query });
    }

    if (mainWindow) mainWindow.webContents.send('gm-window-status', true);

    gmWindow.on('closed', () => {
        gmWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('gm-window-status', false);
        }
    });
}

// --- REGISTRO DE HANDLERS (FUNDAMENTAL) ---
ipcMain.handle('open-gm-window', (event, adventureId) => {
    createGMWindow(adventureId);
});

app.on('ready', () => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });