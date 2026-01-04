const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    readJson: (key) => ipcRenderer.invoke('read-json', key),
    writeJson: (key, data) => ipcRenderer.invoke('write-json', key, data),
    
    saveImage: (id, buffer) => ipcRenderer.invoke('save-image', id, buffer),
    getImage: (id) => ipcRenderer.invoke('get-image', id),
    deleteImage: (id) => ipcRenderer.invoke('delete-image', id),

    saveAudio: (id, buffer, fileName, category) => ipcRenderer.invoke('save-audio', id, buffer, fileName, category),
    getAudio: (id) => ipcRenderer.invoke('get-audio', id),
    deleteAudio: (id) => ipcRenderer.invoke('delete-audio', id),
    listAudio: () => ipcRenderer.invoke('list-audio'),

    openGMWindow: (advId) => ipcRenderer.invoke('open-gm-window', advId),
    onGMStatusChange: (cb) => {
        ipcRenderer.removeAllListeners('gm-window-status');
        ipcRenderer.on('gm-window-status', (_e, v) => cb(v));
    },

    sendSync: (type, data) => ipcRenderer.send('app-sync', { type, data }),
    onSync: (cb) => ipcRenderer.on('app-sync-receive', (_e, arg) => cb(arg)),

    isElectron: true,
});