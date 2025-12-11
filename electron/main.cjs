// electron/main.cjs
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// --- 1. REMOÇÃO COMPLETA DA BARRA DE MENUS NATIVA ---
Menu.setApplicationMenu(null); 

// --- CAMINHO DE DADOS (CORRIGIDO) ---
// Se estiver empacotado (EXE), salva ao lado do executável.
// Se estiver em desenvolvimento, salva na raiz do projeto.
const BASE_PATH = app.isPackaged 
    ? path.dirname(app.getPath('exe')) 
    : app.getAppPath();

const DATA_PATH = path.join(BASE_PATH, 'ecos_data');

// Garante que a pasta de dados exista
if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

// --- FUNÇÕES DE ARQUIVO (JSON) ---
ipcMain.handle('read-json', async (event, key) => {
    const filePath = path.join(DATA_PATH, `${key}.json`);
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error(`Erro ao ler JSON ${key}:`, e);
            return null;
        }
    }
    return null;
});

ipcMain.handle('write-json', async (event, key, data) => {
    const filePath = path.join(DATA_PATH, `${key}.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Erro ao escrever JSON ${key}:`, e);
        return false;
    }
});

// --- FUNÇÕES DE ARQUIVO (IMAGENS) ---
const IMAGES_PATH = path.join(DATA_PATH, 'images');
if (!fs.existsSync(IMAGES_PATH)) {
    fs.mkdirSync(IMAGES_PATH, { recursive: true });
}

ipcMain.handle('save-image', async (event, id, buffer) => {
    const filePath = path.join(IMAGES_PATH, id);
    try {
        fs.writeFileSync(filePath, Buffer.from(buffer)); 
        return true;
    } catch (e) {
        console.error(`Erro ao salvar imagem ${id}:`, e);
        return false;
    }
});

ipcMain.handle('get-image', async (event, id) => {
    const filePath = path.join(IMAGES_PATH, id);
    if (fs.existsSync(filePath)) {
        try {
            return fs.readFileSync(filePath).buffer; 
        } catch (e) {
            console.error(`Erro ao ler imagem ${id}:`, e);
            return null;
        }
    }
    return null;
});

ipcMain.handle('delete-image', async (event, id) => {
    const filePath = path.join(IMAGES_PATH, id);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            return true;
        } catch (e) {
            console.error(`Erro ao deletar imagem ${id}:`, e);
            return false;
        }
    }
    return false;
});

// --- CRIAÇÃO DA JANELA ---
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800, // Opcional: Define tamanho mínimo para UX
        minHeight: 600,
        frame: true, // Mantemos a frame padrão (botões fechar/minimizar)
        autoHideMenuBar: true, // Oculta a barra de menu
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // 2. CORREÇÃO DE CARREGAMENTO (Modo Dev vs Prod)
    // O servidor Vite geralmente roda na porta 5173
    const VITE_DEV_SERVER_URL = 'http://localhost:5173'; 

    // Verifica se estamos no modo de desenvolvimento (pode ser ajustado dependendo do seu script)
    if (process.argv[2] === 'electron:start' || process.env.VITE_DEV) {
        console.log(`Carregando do servidor Vite em: ${VITE_DEV_SERVER_URL}`);
        mainWindow.loadURL(VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        // Modo de produção: Carrega o arquivo buildado (necessita rodar 'npm run build' primeiro)
        const indexPath = path.join(app.getAppPath(), 'dist/index.html');
        console.log(`Carregando do arquivo buildado: ${indexPath}`);
        mainWindow.loadFile(indexPath);
    }
}

app.on('ready', () => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});