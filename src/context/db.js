// src/context/db.js
const DB_NAME = 'EcosVTT_Assets';
const DB_VERSION = 1;
const STORE_NAME = 'images';

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
        request.onerror = (event) => reject('Erro ao abrir banco de imagens');
    });
};

// --- AUXILIAR: Converter Blob para ArrayBuffer (Necessário para enviar ao Electron) ---
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

        // 1. MODO ELECTRON (Salvar no Disco Local)
        if (window.electron) {
            try {
                const buffer = await blobToArrayBuffer(fileOrBlob);
                // Envia para o processo Main salvar o arquivo físico
                await window.electron.saveImage(id, buffer);
                return id;
            } catch (e) {
                console.error("Erro Electron Save:", e);
                return null;
            }
        }

        // 2. MODO WEB (IndexedDB)
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

        // 1. MODO ELECTRON (Ler do Disco Local)
        if (window.electron) {
            try {
                // O Electron deve retornar um ArrayBuffer ou Base64, ou o caminho 'secure-file://'
                const result = await window.electron.getImage(id);
                
                if (result) {
                    // Se vier como Buffer/ArrayBuffer, converte para Blob URL
                    if (result instanceof ArrayBuffer || (result.type === 'Buffer')) {
                         const blob = new Blob([result]);
                         return blob; // O componente Token criará o URL.createObjectURL
                    }
                    // Se o Electron retornar Data URI string diretamente
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

        // 2. MODO WEB (IndexedDB)
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
        // MODO ELECTRON
        if (window.electron) {
            try { await window.electron.deleteImage(id); } catch(e) { console.error(e); }
            return;
        }

        // MODO WEB
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            transaction.objectStore(STORE_NAME).delete(id);
        } catch (e) { console.error(e); }
    },
    
    clearAll: async () => {
        // MODO ELECTRON
        if(window.electron) {
             // Opcional: Implementar limpeza de pasta no main process
            return;
        }

        // MODO WEB
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            transaction.objectStore(STORE_NAME).clear();
        } catch (e) { console.error(e); }
    }
};