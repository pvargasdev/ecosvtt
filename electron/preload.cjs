// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expondo a API 'electron' para o código React (Frontend)
contextBridge.exposeInMainWorld('electron', {
    // JSON Data API
    readJson: (key) => ipcRenderer.invoke('read-json', key),
    writeJson: (key, data) => ipcRenderer.invoke('write-json', key, data),

    // Image Data API
    saveImage: (id, buffer) => ipcRenderer.invoke('save-image', id, buffer),
    getImage: (id) => ipcRenderer.invoke('get-image', id),
    deleteImage: (id) => ipcRenderer.invoke('delete-image', id),
    
    // Flag de ambiente
    isElectron: true,
});