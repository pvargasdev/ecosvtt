// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    readJson: (key) => ipcRenderer.invoke('read-json', key),
    writeJson: (key, data) => ipcRenderer.invoke('write-json', key, data),
    saveImage: (id, buffer) => ipcRenderer.invoke('save-image', id, buffer),
    getImage: (id) => ipcRenderer.invoke('get-image', id),
    deleteImage: (id) => ipcRenderer.invoke('delete-image', id),
    
    // Passa o ID da aventura atual para abrir direto
    openGMWindow: (adventureId) => ipcRenderer.invoke('open-gm-window', adventureId),
    
    // Listener para saber se a janela está aberta (mudar cor do botão)
    onGMStatusChange: (callback) => ipcRenderer.on('gm-window-status', (_event, isOpen) => callback(isOpen)),

    isElectron: true,
});