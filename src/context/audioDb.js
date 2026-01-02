// src/context/audioDb.js
const DB_NAME = 'EcosVTT_AudioAssets';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

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
    saveAudio: async (fileOrBlob, forcedId = null) => {
        const id = forcedId || crypto.randomUUID();

        // 1. TENTATIVA MODO ELECTRON (Somente se o método existir)
        if (window.electron && window.electron.saveAudio) {
            try {
                const buffer = await blobToArrayBuffer(fileOrBlob);
                await window.electron.saveAudio(id, buffer); 
                return id;
            } catch (e) {
                console.warn("Falha ao salvar no Electron, tentando IndexedDB...", e);
                // Não retorna null aqui, deixa cair para o fallback abaixo
            }
        }

        // 2. FALLBACK / MODO WEB (IndexedDB)
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                // Armazena o Blob diretamente
                const request = store.put({ id, blob: fileOrBlob, date: Date.now() });
                
                request.onsuccess = () => resolve(id);
                
                request.onerror = (e) => {
                    console.error("Erro IndexedDB:", e);
                    reject('Erro ao salvar áudio Web');
                };
            });
        } catch (e) {
            console.error("Erro Crítico audioDB:", e);
            return null;
        }
    },

    getAudio: async (id) => {
        if (!id) return null;

        // 1. MODO ELECTRON
        if (window.electron && window.electron.getAudio) {
            try {
                const result = await window.electron.getAudio(id);
                if (result) {
                    if (result instanceof ArrayBuffer || (result.type === 'Buffer')) {
                         return new Blob([result]);
                    }
                    if (typeof result === 'string' && result.startsWith('data:')) {
                        const res = await fetch(result);
                        return await res.blob();
                    }
                }
                // Se não achou no disco, tenta no IndexedDB (caso tenha sido salvo lá via fallback)
            } catch (e) {
                // Continua para IndexedDB
            }
        }

        // 2. MODO WEB
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
        // Tenta deletar nos dois lugares para garantir
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