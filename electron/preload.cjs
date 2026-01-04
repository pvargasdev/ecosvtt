const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    readJson: (key) => ipcRenderer.invoke('read-json', key),
    writeJson: (key, data) => ipcRenderer.invoke('write-json', key, data),
    
    saveImage: (id, buffer) => ipcRenderer.invoke('save-image', id, buffer),
    getImage: (id) => ipcRenderer.invoke('get-image', id),
    deleteImage: (id) => ipcRenderer.invoke('delete-image', id),

    saveAudio: (id, buffer) => ipcRenderer.invoke('save-audio', id, buffer),
    getAudio: (id) => ipcRenderer.invoke('get-audio', id),
    deleteAudio: (id) => ipcRenderer.invoke('delete-audio', id),
    listAudio: () => ipcRenderer.invoke('list-audio'),

    openGMWindow: (adventureId) => ipcRenderer.invoke('open-gm-window', adventureId),
    onGMStatusChange: (callback) => {
        ipcRenderer.removeAllListeners('gm-window-status');
        ipcRenderer.on('gm-window-status', (_event, isOpen) => callback(isOpen));
    },

    sendSync: (type, data) => ipcRenderer.send('app-sync', { type, data }),
    onSync: (callback) => ipcRenderer.on('app-sync-receive', (_event, arg) => callback(arg)),

    isElectron: true,
});