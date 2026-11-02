// Cache local (no computador do jogador) das imagens recebidas do mestre.
// Os IDs de imagem são UUIDs imutáveis (uma imagem nova sempre ganha um ID novo),
// então um asset baixado uma vez nunca precisa ser baixado de novo, nem em
// sessões futuras.

const DB_NAME = 'EcosVTT_RemoteCache';
const STORE = 'assets';
const MAX_ENTRIES = 600;

let dbPromise = null;

const openDB = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
                store.createIndex('date', 'date');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }).catch(e => { dbPromise = null; throw e; });
    }
    return dbPromise;
};

export const remoteCache = {
    async get(id) {
        try {
            const db = await openDB();
            return await new Promise((resolve) => {
                const req = db.transaction(STORE).objectStore(STORE).get(id);
                req.onsuccess = () => resolve(req.result?.blob || null);
                req.onerror = () => resolve(null);
            });
        } catch { return null; }
    },

    async has(id) {
        try {
            const db = await openDB();
            return await new Promise((resolve) => {
                const req = db.transaction(STORE).objectStore(STORE).count(id);
                req.onsuccess = () => resolve(req.result > 0);
                req.onerror = () => resolve(false);
            });
        } catch { return false; }
    },

    async put(id, blob) {
        try {
            const db = await openDB();
            await new Promise((resolve) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).put({ id, blob, date: Date.now() });
                tx.oncomplete = resolve;
                tx.onerror = resolve;
            });
            this.prune();
        } catch { /* cache é opcional */ }
    },

    // Remove os itens mais antigos quando o cache passa do limite.
    async prune() {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const countReq = store.count();
            countReq.onsuccess = () => {
                let excess = countReq.result - MAX_ENTRIES;
                if (excess <= 0) return;
                store.index('date').openCursor().onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (!cursor || excess <= 0) return;
                    cursor.delete();
                    excess--;
                    cursor.continue();
                };
            };
        } catch { /* ignora */ }
    }
};
