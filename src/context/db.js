const DB_NAME = 'EcosVTT_Assets';
const DB_VERSION = 1;
const STORE_NAME = 'images';

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
        request.onerror = (event) => reject('Erro ao abrir banco de imagens');
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

export const imageDB = {
    saveImage: async (fileOrBlob, forcedId = null) => {
        const id = forcedId || crypto.randomUUID();

        if (window.electron) {
            try {
                const buffer = await blobToArrayBuffer(fileOrBlob);
                await window.electron.saveImage(id, buffer);
                return id;
            } catch (e) {
                console.error("Erro Electron Save:", e);
                return null;
            }
        }

        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put({ id, blob: fileOrBlob, date: Date.now() });
                request.onsuccess = () => resolve(id);
                request.onerror = () => reject('Erro ao salvar imagem Web');
            });
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    getImage: async (id) => {
        if (!id) return null;

        if (window.electron) {
            try {
                const result = await window.electron.getImage(id);
                
                if (result) {
                    if (result instanceof ArrayBuffer || (result.type === 'Buffer')) {
                         const blob = new Blob([result]);
                         return blob;
                    }
                    if (typeof result === 'string' && result.startsWith('data:')) {
                        const res = await fetch(result);
                        return await res.blob();
                    }
                }
                return null;
            } catch (e) {
                return null;
            }
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

    deleteImage: async (id) => {
        if (window.electron) {
            try { await window.electron.deleteImage(id); } catch(e) { console.error(e); }
            return;
        }

        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            transaction.objectStore(STORE_NAME).delete(id);
        } catch (e) { console.error(e); }
    },
    
    clearAll: async () => {
        if(window.electron) {
            return;
        }

        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            transaction.objectStore(STORE_NAME).clear();
        } catch (e) { console.error(e); }
    }
};