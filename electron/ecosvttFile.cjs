// Leitura e escrita de arquivos .ecosvtt.
//
// Um .ecosvtt é um ZIP comum (dá para abrir no Windows Explorer) com a mesma
// estrutura do antigo "Exportar (.zip)":
//
//   images/<id>            imagens (guardadas sem recompressão: já são PNG/JPG/WebP)
//   audio/<id>             áudios
//   audio_manifest.json    nome e categoria de cada áudio
//   ecosvtt.json           identificação do formato
//   adventure.json         a aventura em si
//
// Os três JSON ficam sempre no FIM do arquivo (a "cauda"). Como as imagens e áudios
// nunca mudam (um asset novo sempre tem um ID novo), salvar a aventura normalmente
// só reescreve a cauda: o arquivo é truncado no início dela e os JSON + o índice do
// ZIP são escritos de novo. Assim salvar uma aventura com 1 GB de mapas e músicas
// custa o mesmo que salvar uma pequena. Antes de mexer no arquivo, um diário
// (journal) é gravado para que uma queda de energia no meio da escrita possa ser
// desfeita na próxima abertura do programa.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

const TAIL_NAMES = ['audio_manifest.json', 'ecosvtt.json', 'adventure.json'];
const FORMAT_VERSION = 1;

// --- CRC32 -----------------------------------------------------------------
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};

// --- Estruturas do ZIP -----------------------------------------------------
const dosDateTime = (date = new Date()) => {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
};

const localHeader = (entry) => {
    const name = Buffer.from(entry.name, 'utf8');
    const buf = Buffer.alloc(30 + name.length);
    buf.writeUInt32LE(SIG_LOCAL, 0);
    buf.writeUInt16LE(20, 4);
    buf.writeUInt16LE(FLAG_UTF8, 6);
    buf.writeUInt16LE(entry.method, 8);
    buf.writeUInt16LE(entry.time, 10);
    buf.writeUInt16LE(entry.day, 12);
    buf.writeUInt32LE(entry.crc, 14);
    buf.writeUInt32LE(entry.compSize, 18);
    buf.writeUInt32LE(entry.size, 22);
    buf.writeUInt16LE(name.length, 26);
    buf.writeUInt16LE(0, 28);
    name.copy(buf, 30);
    return buf;
};

const centralDirectory = (entries) => {
    const parts = entries.map(entry => {
        const name = Buffer.from(entry.name, 'utf8');
        const buf = Buffer.alloc(46 + name.length);
        buf.writeUInt32LE(SIG_CENTRAL, 0);
        buf.writeUInt16LE(20, 4);
        buf.writeUInt16LE(20, 6);
        buf.writeUInt16LE(FLAG_UTF8, 8);
        buf.writeUInt16LE(entry.method, 10);
        buf.writeUInt16LE(entry.time, 12);
        buf.writeUInt16LE(entry.day, 14);
        buf.writeUInt32LE(entry.crc, 16);
        buf.writeUInt32LE(entry.compSize, 20);
        buf.writeUInt32LE(entry.size, 24);
        buf.writeUInt16LE(name.length, 28);
        buf.writeUInt32LE(entry.offset, 42);
        name.copy(buf, 46);
        return buf;
    });
    return Buffer.concat(parts);
};

const endOfCentralDirectory = (count, cdSize, cdOffset) => {
    const buf = Buffer.alloc(22);
    buf.writeUInt32LE(SIG_EOCD, 0);
    buf.writeUInt16LE(count, 8);
    buf.writeUInt16LE(count, 10);
    buf.writeUInt32LE(cdSize, 12);
    buf.writeUInt32LE(cdOffset, 16);
    return buf;
};

const MAX_ZIP32 = 0xffffffff;

const writeAll = (fd, buf, position) => {
    let written = 0;
    while (written < buf.length) written += fs.writeSync(fd, buf, written, buf.length - written, position + written);
    return buf.length;
};

const readAt = (fd, length, position) => {
    const buf = Buffer.alloc(length);
    let read = 0;
    while (read < length) {
        const n = fs.readSync(fd, buf, read, length - read, position + read);
        if (n === 0) break;
        read += n;
    }
    return read === length ? buf : buf.subarray(0, read);
};

// Escreve uma entrada a partir de dados já prontos (comprimidos ou não).
const writeEntry = (fd, position, name, payload, { method, crc, size }) => {
    const { time, day } = dosDateTime();
    const entry = { name, method, crc, size, compSize: payload.length, time, day, offset: position };
    if (position + payload.length > MAX_ZIP32) throw new Error('Arquivo de aventura maior que 4 GB não é suportado.');
    let pos = position;
    pos += writeAll(fd, localHeader(entry), pos);
    pos += writeAll(fd, payload, pos);
    return { entry, end: pos };
};

const writeRawEntry = (fd, position, name, data, compress) => {
    if (compress) {
        return writeEntry(fd, position, name, zlib.deflateRawSync(data, { level: 6 }), { method: METHOD_DEFLATE, crc: crc32(data), size: data.length });
    }
    return writeEntry(fd, position, name, data, { method: METHOD_STORE, crc: crc32(data), size: data.length });
};

// --- Leitura do índice -----------------------------------------------------
const readCentralDirectory = (fd, fileSize) => {
    const tailLen = Math.min(fileSize, 65557);
    const tail = readAt(fd, tailLen, fileSize - tailLen);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
        if (tail.readUInt32LE(i) === SIG_EOCD) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Arquivo de aventura corrompido ou não é um .ecosvtt/.zip válido.');
    const count = tail.readUInt16LE(eocd + 10);
    const cdSize = tail.readUInt32LE(eocd + 12);
    const cdOffset = tail.readUInt32LE(eocd + 16);
    const cd = readAt(fd, cdSize, cdOffset);
    const entries = [];
    let p = 0;
    for (let i = 0; i < count && p + 46 <= cd.length; i++) {
        if (cd.readUInt32LE(p) !== SIG_CENTRAL) break;
        const nameLen = cd.readUInt16LE(p + 28);
        const extraLen = cd.readUInt16LE(p + 30);
        const commentLen = cd.readUInt16LE(p + 32);
        entries.push({
            method: cd.readUInt16LE(p + 10),
            time: cd.readUInt16LE(p + 12),
            day: cd.readUInt16LE(p + 14),
            crc: cd.readUInt32LE(p + 16),
            compSize: cd.readUInt32LE(p + 20),
            size: cd.readUInt32LE(p + 24),
            offset: cd.readUInt32LE(p + 42),
            name: cd.toString('utf8', p + 46, p + 46 + nameLen)
        });
        p += 46 + nameLen + extraLen + commentLen;
    }
    return { entries, cdOffset };
};

const dataStart = (fd, entry) => {
    const header = readAt(fd, 30, entry.offset);
    if (header.readUInt32LE(0) !== SIG_LOCAL) throw new Error(`Entrada inválida no arquivo: ${entry.name}`);
    return entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
};

const readCompressed = (fd, entry) => readAt(fd, entry.compSize, dataStart(fd, entry));

const readEntryData = (fd, entry) => {
    const raw = readCompressed(fd, entry);
    if (entry.method === METHOD_STORE) return raw;
    if (entry.method === METHOD_DEFLATE) return zlib.inflateRawSync(raw);
    throw new Error(`Compressão não suportada (${entry.method}) em ${entry.name}`);
};

// --- API de alto nível ------------------------------------------------------
// Abre um arquivo e devolve o índice + o conteúdo dos JSON. `open` mantém o
// arquivo aberto só durante a leitura.
const inspect = (filePath) => {
    const fd = fs.openSync(filePath, 'r');
    try {
        const { size } = fs.fstatSync(fd);
        const { entries, cdOffset } = readCentralDirectory(fd, size);
        const byName = new Map(entries.map(e => [e.name, e]));
        const readJson = (name) => {
            const e = byName.get(name);
            if (!e) return null;
            try { return JSON.parse(readEntryData(fd, e).toString('utf8')); } catch { return null; }
        };
        const adventure = readJson('adventure.json');
        if (!adventure) throw new Error('O arquivo não contém uma aventura (adventure.json ausente).');

        // O arquivo está no "nosso" formato quando os JSON formam a cauda: aí dá para
        // salvar reescrevendo só a cauda.
        const tailEntries = entries.filter(e => TAIL_NAMES.includes(e.name));
        const assetEntries = entries.filter(e => !TAIL_NAMES.includes(e.name));
        const tailOffset = tailEntries.length ? Math.min(...tailEntries.map(e => e.offset)) : cdOffset;
        const maxAssetEnd = assetEntries.reduce((m, e) => Math.max(m, e.offset), -1);
        const incremental = tailEntries.length === TAIL_NAMES.length && maxAssetEnd < tailOffset && !!readJson('ecosvtt.json');
        const usedBytes = assetEntries.reduce((s, e) => s + e.compSize + 30 + Buffer.byteLength(e.name), 0);

        return {
            adventure,
            manifest: readJson('ecosvtt.json'),
            audioManifest: readJson('audio_manifest.json') || {},
            assets: assetEntries,
            tailOffset,
            incremental,
            fileSize: size,
            deadBytes: Math.max(0, tailOffset - usedBytes)
        };
    } finally {
        fs.closeSync(fd);
    }
};

const extractEntries = (filePath, entries, onEntry) => {
    const fd = fs.openSync(filePath, 'r');
    try {
        for (const e of entries) onEntry(e, readEntryData(fd, e));
    } finally {
        fs.closeSync(fd);
    }
};

const tailPayloads = (adventure, audioManifest) => ({
    'audio_manifest.json': Buffer.from(JSON.stringify(audioManifest || {}), 'utf8'),
    'ecosvtt.json': Buffer.from(JSON.stringify({ format: 'ecosvtt', version: FORMAT_VERSION, adventureId: adventure.id, name: adventure.name, savedAt: Date.now() }), 'utf8'),
    'adventure.json': Buffer.from(JSON.stringify(adventure), 'utf8')
});

const writeTailAndIndex = (fd, position, keptEntries, payloads) => {
    let pos = position;
    const entries = [...keptEntries];
    for (const name of TAIL_NAMES) {
        const res = writeRawEntry(fd, pos, name, payloads[name], true);
        entries.push(res.entry);
        pos = res.end;
    }
    const cd = centralDirectory(entries);
    const cdOffset = pos;
    pos += writeAll(fd, cd, pos);
    pos += writeAll(fd, endOfCentralDirectory(entries.length, cd.length, cdOffset), pos);
    fs.ftruncateSync(fd, pos);
    return { entries, end: pos };
};

// Gravação completa num arquivo temporário + troca atômica. Usada para criar
// arquivos, para converter um ZIP antigo e para compactar espaço morto.
// `sources`: lista de { name, fromFile?: {path, entry}, fromPath?: string }.
const writeFull = (targetPath, sources, adventure, audioManifest) => {
    const tmp = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
    const fd = fs.openSync(tmp, 'w');
    const readers = new Map();
    try {
        let pos = 0;
        const assets = [];
        for (const src of sources) {
            if (src.fromFile) {
                // Copia os bytes já comprimidos do arquivo antigo, sem recomprimir.
                let rfd = readers.get(src.fromFile.path);
                if (rfd === undefined) { rfd = fs.openSync(src.fromFile.path, 'r'); readers.set(src.fromFile.path, rfd); }
                const e = src.fromFile.entry;
                const res = writeEntry(fd, pos, src.name, readCompressed(rfd, e), { method: e.method, crc: e.crc, size: e.size });
                assets.push(res.entry); pos = res.end;
            } else if (src.fromPath && fs.existsSync(src.fromPath)) {
                const res = writeRawEntry(fd, pos, src.name, fs.readFileSync(src.fromPath), false);
                assets.push(res.entry); pos = res.end;
            }
        }
        const tailOffset = pos;
        const { entries } = writeTailAndIndex(fd, pos, assets, tailPayloads(adventure, audioManifest));
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        readers.forEach(r => fs.closeSync(r));
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.renameSync(tmp, targetPath);
        return { assets: entries.filter(e => !TAIL_NAMES.includes(e.name)), tailOffset, deadBytes: 0 };
    } catch (e) {
        try { fs.closeSync(fd); } catch { /* já fechado */ }
        readers.forEach(r => { try { fs.closeSync(r); } catch { /* idem */ } });
        try { fs.unlinkSync(tmp); } catch { /* não existe */ }
        throw e;
    }
};

// Gravação incremental: mantém os assets que continuam em uso, acrescenta os novos
// no fim e reescreve a cauda. Assets que deixaram de ser usados saem do índice e
// viram espaço morto (recuperado depois por uma compactação).
const writeIncremental = (filePath, state, newAssetSources, adventure, audioManifest, keepNames, journal) => {
    const kept = state.assets.filter(e => keepNames.has(e.name));
    const removedBytes = state.assets.filter(e => !keepNames.has(e.name)).reduce((s, e) => s + e.compSize, 0);

    journal.write({ filePath, tailOffset: state.tailOffset, kept, adventure, audioManifest });
    const fd = fs.openSync(filePath, 'r+');
    try {
        let pos = state.tailOffset;
        const assets = [...kept];
        for (const src of newAssetSources) {
            if (!fs.existsSync(src.fromPath)) continue;
            const res = writeRawEntry(fd, pos, src.name, fs.readFileSync(src.fromPath), false);
            assets.push(res.entry); pos = res.end;
        }
        const tailOffset = pos;
        writeTailAndIndex(fd, pos, assets, tailPayloads(adventure, audioManifest));
        fs.fsyncSync(fd);
        journal.clear();
        return { assets, tailOffset, deadBytes: state.deadBytes + removedBytes };
    } finally {
        fs.closeSync(fd);
    }
};

// Refaz uma gravação interrompida a partir do diário.
const recoverFromJournal = (data) => {
    if (!data?.filePath || !fs.existsSync(data.filePath)) return false;
    const fd = fs.openSync(data.filePath, 'r+');
    try {
        writeTailAndIndex(fd, data.tailOffset, data.kept, tailPayloads(data.adventure, data.audioManifest));
        fs.fsyncSync(fd);
        return true;
    } finally {
        fs.closeSync(fd);
    }
};

module.exports = { inspect, extractEntries, writeFull, writeIncremental, recoverFromJournal, TAIL_NAMES };
