import {
    CHUNK_SIZE, FRAME_DATA, FRAME_META, FRAME_MISSING,
    encodeMeta, encodeData, encodeMissing, decodeFrame
} from './protocol';
import { remoteCache } from './remoteCache';

// Prioridades: quanto menor, mais urgente.
export const PRIORITY = { CRITICAL: 0, VISIBLE: 1, PREFETCH: 2 };

const BUFFER_HIGH = 2 * 1024 * 1024;
const BUFFER_LOW = 512 * 1024;

let nextTransferId = 1;

// ---------------------------------------------------------------------------
// Lado do mestre: uma instância por jogador. Mantém uma fila de pedidos e envia
// em pedaços de 64 KB, sempre escolhendo o pedido mais urgente antes de cada
// pedaço. Assim o mapa da cena atual "fura a fila" de um pré-carregamento que
// já estava no meio, e o canal nunca enche além do que a conexão aguenta.
// ---------------------------------------------------------------------------
export class AssetSender {
    constructor(conn, resolveBlob) {
        this.conn = conn;
        this.resolveBlob = resolveBlob;
        this.jobs = new Map();
        this.seq = 0;
        this.pumping = false;
        this.closed = false;
    }

    request(id, priority) {
        const job = this.jobs.get(id);
        if (job) {
            job.priority = Math.min(job.priority, priority);
        } else {
            this.jobs.set(id, { id, priority, seq: this.seq++, buffer: null, offset: 0, transferId: 0 });
        }
        this.pump();
    }

    close() {
        this.closed = true;
        this.jobs.clear();
    }

    nextJob() {
        let best = null;
        for (const job of this.jobs.values()) {
            if (!best || job.priority < best.priority || (job.priority === best.priority && job.seq < best.seq)) best = job;
        }
        return best;
    }

    waitForDrain() {
        const channel = this.conn.dataChannel;
        if (!channel || channel.bufferedAmount < BUFFER_HIGH) return Promise.resolve();
        return new Promise((resolve) => {
            channel.bufferedAmountLowThreshold = BUFFER_LOW;
            const done = () => { channel.removeEventListener('bufferedamountlow', done); clearTimeout(timer); resolve(); };
            const timer = setTimeout(done, 2000);
            channel.addEventListener('bufferedamountlow', done);
        });
    }

    waitForOpen() {
        if (this.conn.open) return Promise.resolve();
        return new Promise((resolve) => this.conn.once('open', resolve));
    }

    async pump() {
        if (this.pumping) return;
        this.pumping = true;
        try {
            await this.waitForOpen();
            while (!this.closed && this.jobs.size > 0) {
                const job = this.nextJob();
                if (!job.buffer) {
                    let blob = null;
                    try { blob = await this.resolveBlob(job.id); } catch { blob = null; }
                    if (this.closed) return;
                    if (!blob) {
                        this.conn.send(encodeMissing(job.id));
                        this.jobs.delete(job.id);
                        continue;
                    }
                    job.buffer = new Uint8Array(await blob.arrayBuffer());
                    job.transferId = nextTransferId++;
                    this.conn.send(encodeMeta(job.transferId, job.buffer.byteLength, job.id, blob.type));
                }
                await this.waitForDrain();
                if (this.closed) return;
                const end = Math.min(job.offset + CHUNK_SIZE, job.buffer.byteLength);
                this.conn.send(encodeData(job.transferId, job.offset, job.buffer.subarray(job.offset, end)));
                job.offset = end;
                if (job.offset >= job.buffer.byteLength) this.jobs.delete(job.id);
            }
        } finally {
            this.pumping = false;
        }
    }
}

// ---------------------------------------------------------------------------
// Lado do jogador: busca imagens sob demanda. Ordem: memória → cache local
// (IndexedDB) → pedido ao mestre. Pedidos repetidos para o mesmo ID são
// unificados, e um pedido de pré-carregamento é promovido se a imagem passar
// a ser necessária na tela.
// ---------------------------------------------------------------------------
export class AssetClient {
    constructor(sendRequest) {
        this.sendRequest = sendRequest;
        this.memory = new Map();
        this.pending = new Map();
        this.transfers = new Map();
        this.listeners = new Set();
    }

    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    emit() {
        const stats = this.getStats();
        this.listeners.forEach(fn => fn(stats));
    }

    getStats() {
        let total = 0, received = 0, active = 0;
        for (const tr of this.transfers.values()) {
            if (tr.isPrefetch) continue;
            total += tr.size; received += tr.received; active++;
        }
        const waiting = [...this.pending.values()].filter(p => p.priority < PRIORITY.PREFETCH).length;
        return { active, waiting, total, received };
    }

    get(id, priority = PRIORITY.VISIBLE) {
        if (this.memory.has(id)) return Promise.resolve(this.memory.get(id));

        const existing = this.pending.get(id);
        if (existing) {
            if (priority < existing.priority) {
                existing.priority = priority;
                if (existing.requested) this.sendRequest(id, priority);
            }
            return existing.promise;
        }

        const entry = { priority, requested: false };
        entry.promise = new Promise((resolve) => { entry.resolve = resolve; });
        this.pending.set(id, entry);

        const persistent = !id.startsWith('drawing:');
        (persistent ? remoteCache.get(id) : Promise.resolve(null)).then(cached => {
            if (cached) {
                this.finish(id, cached);
                return;
            }
            entry.requested = true;
            this.sendRequest(id, entry.priority);
            this.emit();
        });
        return entry.promise;
    }

    async prefetch(ids) {
        for (const id of ids) {
            if (this.memory.has(id) || this.pending.has(id)) continue;
            if (await remoteCache.has(id)) continue;
            this.get(id, PRIORITY.PREFETCH);
        }
    }

    // Reenvia tudo que estava pendente (após reconexão).
    resendPending() {
        this.transfers.clear();
        for (const [id, entry] of this.pending) {
            if (entry.requested) this.sendRequest(id, entry.priority);
        }
    }

    finish(id, blob) {
        if (blob && !id.startsWith('drawing:')) this.memory.set(id, blob);
        const entry = this.pending.get(id);
        this.pending.delete(id);
        entry?.resolve(blob);
        this.emit();
    }

    handleFrame(data) {
        const buf = data instanceof ArrayBuffer ? data : data?.buffer;
        if (!buf) return;
        const frame = decodeFrame(buf);
        if (!frame) return;

        if (frame.type === FRAME_META) {
            const isPrefetch = (this.pending.get(frame.id)?.priority ?? 0) >= PRIORITY.PREFETCH;
            this.transfers.set(frame.transferId, {
                id: frame.id, mime: frame.mime, size: frame.size,
                bytes: new Uint8Array(frame.size), received: 0, isPrefetch
            });
            if (frame.size === 0) this.completeTransfer(frame.transferId);
            else this.emit();
        } else if (frame.type === FRAME_DATA) {
            const tr = this.transfers.get(frame.transferId);
            if (!tr) return;
            tr.bytes.set(frame.bytes, frame.offset);
            tr.received += frame.bytes.byteLength;
            if (tr.received >= tr.size) this.completeTransfer(frame.transferId);
            else if (!tr.isPrefetch) this.emit();
        } else if (frame.type === FRAME_MISSING) {
            this.finish(frame.id, null);
        }
    }

    completeTransfer(transferId) {
        const tr = this.transfers.get(transferId);
        this.transfers.delete(transferId);
        const blob = new Blob([tr.bytes], { type: tr.mime });
        if (!tr.id.startsWith('drawing:')) remoteCache.put(tr.id, blob);
        this.finish(tr.id, blob);
    }

    clearMemory() {
        this.memory.clear();
    }
}
