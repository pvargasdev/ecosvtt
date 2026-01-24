const DB_NAME = 'EcosVTT_AudioAssets';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

const openDB = () => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject('IndexedDB não suportado');
            return;
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject('Erro ao abrir banco de áudio');
    });
};

const blobToArrayBuffer = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
};

export const audioDB = {
    saveAudio: async (fileOrBlob, category = 'music', forcedId = null) => {
        const id = forcedId || crypto.randomUUID();
        const fileName = fileOrBlob.name || "Audio Sem Nome";
        const fileSize = fileOrBlob.size || 0;
        const fileType = fileOrBlob.type || "audio/unknown";

        if (window.electron && window.electron.saveAudio) {
            try {
                const buffer = await blobToArrayBuffer(fileOrBlob);
                await window.electron.saveAudio(id, buffer, fileName, category); 
                return id;
            } catch (e) {
                console.warn("Falha no Electron, tentando Web...", e);
            }
        }

        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                
                const record = { 
                    id, 
                    blob: fileOrBlob, 
                    name: fileName,
                    size: fileSize,
                    type: fileType,
                    category: category,
                    date: Date.now() 
                };
                
                const request = store.put(record);
                request.onsuccess = () => resolve(id);
                request.onerror = (e) => reject('Erro ao salvar áudio Web');
            });
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    getAllAudioMetadata: async () => {
        if (window.electron && window.electron.listAudio) {
            return await window.electron.listAudio();
        }

        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll(); 
                
                request.onsuccess = () => {
                    const results = request.result || [];
                    const metadata = results.map(item => ({
                        id: item.id,
                        name: item.name || "Sem Nome",
                        date: item.date,
                        size: item.size,
                        category: item.category || 'music'
                    })).sort((a, b) => b.date - a.date);
                    resolve(metadata);
                };
                request.onerror = () => resolve([]);
            });
        } catch (e) {
            return [];
        }
    },

    getAudio: async (id) => {
        if (!id) return null;

        if (window.electron && window.electron.getAudio) {
            try {
                const result = await window.electron.getAudio(id);
                if (result) {
                    if (result instanceof ArrayBuffer || (result.type === 'Buffer')) return new Blob([result]);
                    if (typeof result === 'string' && result.startsWith('data:')) {
                        const res = await fetch(result);
                        return await res.blob();
                    }
                }
            } catch (e) {}
        }

        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(id);
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.blob : null);
                };
                request.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    },

    deleteAudio: async (id) => {
        if (window.electron && window.electron.deleteAudio) {
            try { await window.electron.deleteAudio(id); } catch(e) { console.error(e); }
        }

        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            transaction.objectStore(STORE_NAME).delete(id);
        } catch (e) { console.error(e); }
    },
    
    clearAll: async () => {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            transaction.objectStore(STORE_NAME).clear();
        } catch (e) { console.error(e); }
    }
};