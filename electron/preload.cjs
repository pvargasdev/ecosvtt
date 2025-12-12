// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

console.log("🔌 Preload Script Carregado com Sucesso!"); // Se não ver isso no Console (F12), o preload falhou.

contextBridge.exposeInMainWorld('electron', {
    // Dados
    readJson: (key) => ipcRenderer.invoke('read-json', key),
    writeJson: (key, data) => ipcRenderer.invoke('write-json', key, data),
    saveImage: (id, buffer) => ipcRenderer.invoke('save-image', id, buffer),
    getImage: (id) => ipcRenderer.invoke('get-image', id),
    deleteImage: (id) => ipcRenderer.invoke('delete-image', id),
    
    // Janela do Mestre (Com Logs)
    openGMWindow: (adventureId) => {
        console.log("tentei abrir janela mestre via preload");
        return ipcRenderer.invoke('open-gm-window', adventureId);
    },
    
    // Listener de Status
    onGMStatusChange: (callback) => {
        // Remove listeners antigos para evitar duplicação em hot-reload
        ipcRenderer.removeAllListeners('gm-window-status'); 
        ipcRenderer.on('gm-window-status', (_event, isOpen) => callback(isOpen));
    },

    isElectron: true,
});