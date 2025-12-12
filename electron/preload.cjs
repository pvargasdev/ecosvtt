// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // ... (readJson, writeJson, saveImage, etc... MANTENHA ELES) ...
    readJson: (key) => ipcRenderer.invoke('read-json', key),
    writeJson: (key, data) => ipcRenderer.invoke('write-json', key, data),
    saveImage: (id, buffer) => ipcRenderer.invoke('save-image', id, buffer),
    getImage: (id) => ipcRenderer.invoke('get-image', id),
    deleteImage: (id) => ipcRenderer.invoke('delete-image', id),

    // Janelas
    openGMWindow: (adventureId) => ipcRenderer.invoke('open-gm-window', adventureId),
    onGMStatusChange: (callback) => {
        ipcRenderer.removeAllListeners('gm-window-status');
        ipcRenderer.on('gm-window-status', (_event, isOpen) => callback(isOpen));
    },

    // --- NOVO: SINCRONIZAÇÃO VIA IPC (PARA BUILD .EXE) ---
    sendSync: (type, data) => ipcRenderer.send('app-sync', { type, data }),
    onSync: (callback) => ipcRenderer.on('app-sync-receive', (_event, arg) => callback(arg)),

    isElectron: true,
});