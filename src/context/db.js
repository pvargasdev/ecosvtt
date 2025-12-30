// src/context/db.js
const DB_NAME = 'EcosVTT_Assets';
const DB_VERSION = 2; // [ATENÇÃO] Incrementamos a versão para criar a nova store
const STORE_IMAGES = 'images';
const STORE_AUDIO = 'audio'; // Nova Store

// --- LÓGICA WEB (IndexedDB) ---
const openDB = () => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject('IndexedDB não suportado');
            return;
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Cria store de imagens se não existir
            if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
            }
            // [NOVO] Cria store de áudio se não existir
            if (!db.objectStoreNames.contains(STORE_AUDIO)) {
                db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject('Erro ao abrir banco de dados');
    });
};

// --- AUXILIAR: Converter Blob para ArrayBuffer ---
const blobToArrayBuffer = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
};

export const imageDB = {
    // --- IMAGENS (Mantido igual) ---
    saveImage: async (fileOrBlob, forcedId = null) => {
        const id = forcedId || crypto.randomUUID();
        if (window.electron) {
            try {
                const buffer = await blobToArrayBuffer(fileOrBlob);
                await window.electron.saveImage(id, buffer);
                return id;
            } catch (e) { console.error("Erro Electron Save Image:", e); return null; }
        }
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_IMAGES], 'readwrite');
                const request = transaction.objectStore(STORE_IMAGES).put({ id, blob: fileOrBlob, date: Date.now() });
                request.onsuccess = () => resolve(id);
                request.onerror = () => reject('Erro ao salvar imagem Web');
            });
        } catch (e) { console.error(e); return null; }
    },

    getImage: async (id) => {
        if (!id) return null;
        if (window.electron) {
            try {
                const result = await window.electron.getImage(id);
                if (result) {
                    if (result instanceof ArrayBuffer || (result.type === 'Buffer')) {
                         return new Blob([result]);
                    }
                    if (typeof result === 'string' && result.startsWith('data:')) {
                        const res = await fetch(result);
                        return await res.blob();
                    }
                }
                return null;
            } catch (e) { return null; }
        }
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const request = db.transaction([STORE_IMAGES], 'readonly').objectStore(STORE_IMAGES).get(id);
                request.onsuccess = () => resolve(request.result ? request.result.blob : null);
                request.onerror = () => resolve(null);
            });
        } catch (e) { return null; }
    },

    deleteImage: async (id) => {
        if (window.electron) {
            try { await window.electron.deleteImage(id); } catch(e) { console.error(e); }
            return;
        }
        try {
            const db = await openDB();
            db.transaction([STORE_IMAGES], 'readwrite').objectStore(STORE_IMAGES).delete(id);
        } catch (e) { console.error(e); }
    },
    
    // --- [NOVO] ÁUDIO ---
    
    saveAudio: async (fileOrBlob, forcedId = null) => {
        const id = forcedId || crypto.randomUUID();

        // 1. MODO ELECTRON
        if (window.electron) {
            try {
                const buffer = await blobToArrayBuffer(fileOrBlob);
                if (window.electron.saveAudio) {
                    await window.electron.saveAudio(id, buffer);
                } else {
                    console.warn("Método window.electron.saveAudio não encontrado no preload.");
                    return null;
                }
                return id;
            } catch (e) {
                console.error("Erro Electron Save Audio:", e);
                return null;
            }
        }

        // 2. MODO WEB (IndexedDB)
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_AUDIO], 'readwrite');
                const store = transaction.objectStore(STORE_AUDIO);
                const request = store.put({ 
                    id, 
                    blob: fileOrBlob, 
                    type: fileOrBlob.type, 
                    date: Date.now() 
                });
                request.onsuccess = () => resolve(id);
                request.onerror = () => reject('Erro ao salvar áudio Web');
            });
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    getAudio: async (id) => {
        if (!id) return null;

        // 1. MODO ELECTRON
        if (window.electron) {
            try {
                if (window.electron.getAudio) {
                    const result = await window.electron.getAudio(id);
                    // [CORREÇÃO] Verifica se veio resultado e cria o Blob corretamente
                    if (result) {
                         // Aceita tanto Buffer quanto ArrayBuffer ou Uint8Array
                        return new Blob([result], { type: 'audio/mpeg' }); 
                    }
                }
                return null;
            } catch (e) {
                return null;
            }
        }

        // 2. MODO WEB
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_AUDIO], 'readonly');
                const store = transaction.objectStore(STORE_AUDIO);
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
        if (window.electron) {
            try { 
                if(window.electron.deleteAudio) await window.electron.deleteAudio(id); 
            } catch(e) { console.error(e); }
            return;
        }
        try {
            const db = await openDB();
            db.transaction([STORE_AUDIO], 'readwrite').objectStore(STORE_AUDIO).delete(id);
        } catch (e) { console.error(e); }
    },

    clearAll: async () => {
        if(window.electron) return;
        try {
            const db = await openDB();
            const tx = db.transaction([STORE_IMAGES, STORE_AUDIO], 'readwrite');
            tx.objectStore(STORE_IMAGES).clear();
            tx.objectStore(STORE_AUDIO).clear();
        } catch (e) { console.error(e); }
    }
};