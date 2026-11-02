const { contextBridge, ipcRenderer, webUtils } = require('electron');

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

    quit: () => ipcRenderer.invoke('app:quit'),
    onBeforeClose: (cb) => {
        ipcRenderer.removeAllListeners('app:before-close');
        ipcRenderer.on('app:before-close', () => cb());
    },
    readyToClose: () => ipcRenderer.send('app:ready-to-close'),

    // Aventuras em arquivos .ecosvtt
    adventures: {
        list: () => ipcRenderer.invoke('adv:list'),
        create: (adventure) => ipcRenderer.invoke('adv:create', adventure),
        open: (entryId) => ipcRenderer.invoke('adv:open', entryId),
        save: (entryId, adventure) => ipcRenderer.invoke('adv:save', entryId, adventure),
        updateMeta: (entryId, updates) => ipcRenderer.invoke('adv:updateMeta', entryId, updates),
        relocate: (entryId) => ipcRenderer.invoke('adv:relocate', entryId),
        openFile: () => ipcRenderer.invoke('adv:openFile'),
        openPath: (filePath) => ipcRenderer.invoke('adv:openPath', filePath),
        remove: (entryId, moveToTrash) => ipcRenderer.invoke('adv:remove', entryId, moveToTrash),
        duplicate: (entryId, copyName) => ipcRenderer.invoke('adv:duplicate', entryId, copyName),
        saveCopy: (entryId) => ipcRenderer.invoke('adv:saveCopy', entryId),
        showInFolder: (entryId) => ipcRenderer.invoke('adv:showInFolder', entryId),
        onFilesOpened: (cb) => {
            ipcRenderer.removeAllListeners('adv:files-opened');
            ipcRenderer.on('adv:files-opened', (_e, files) => cb(files));
        },
        pathForFile: (file) => { try { return webUtils.getPathForFile(file); } catch { return null; } }
    },

    isElectron: true,
});