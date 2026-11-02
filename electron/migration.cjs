// Migração dos dados da versão antiga, que guardava tudo numa pasta "ecos_data"
// ao lado do executável. Na primeira execução da versão nova:
//  - imagens, áudios e configurações são copiados para %APPDATA%\ECOS Tabletop;
//  - cada aventura vira um arquivo .ecosvtt em Documentos\ECOS Tabletop.
// A pasta antiga nunca é apagada, para não haver risco de perda.

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const OLD_ADVENTURES_FILE = 'ecos_vtt_adventures_v3.json';
const MARKER = '.migrated_from_ecos_data';

const candidateDirs = () => {
    const dirs = [];
    if (process.env.PORTABLE_EXECUTABLE_DIR) dirs.push(path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'ecos_data'));
    try { dirs.push(path.join(path.dirname(app.getPath('exe')), 'ecos_data')); } catch { /* ignora */ }
    dirs.push(path.join(app.getAppPath(), 'ecos_data'));
    dirs.push(path.join(app.getPath('userData'), 'ecos_data'));
    return [...new Set(dirs)];
};

const copyDirMissing = (from, to) => {
    if (!fs.existsSync(from)) return 0;
    fs.mkdirSync(to, { recursive: true });
    let count = 0;
    fs.readdirSync(from).forEach(name => {
        const src = path.join(from, name);
        const dst = path.join(to, name);
        if (!fs.existsSync(dst) && fs.statSync(src).isFile()) { fs.copyFileSync(src, dst); count++; }
    });
    return count;
};

const migrateLegacyData = (paths, store) => {
    const marker = path.join(paths.userData, MARKER);
    if (fs.existsSync(marker)) return;

    const oldDir = candidateDirs().find(d => fs.existsSync(path.join(d, OLD_ADVENTURES_FILE)) || fs.existsSync(path.join(d, 'images')));
    if (!oldDir) { fs.writeFileSync(marker, 'none'); return; }

    try {
        copyDirMissing(path.join(oldDir, 'images'), paths.images);
        copyDirMissing(path.join(oldDir, 'audio'), paths.audio);
        fs.readdirSync(oldDir)
            .filter(n => n.endsWith('.json') && n !== OLD_ADVENTURES_FILE)
            .forEach(n => {
                const dst = path.join(paths.userData, n);
                if (!fs.existsSync(dst)) fs.copyFileSync(path.join(oldDir, n), dst);
            });

        let adventures = [];
        try { adventures = JSON.parse(fs.readFileSync(path.join(oldDir, OLD_ADVENTURES_FILE), 'utf8')) || []; } catch { adventures = []; }

        const targetDir = path.join(app.getPath('documents'), 'ECOS Tabletop');
        let converted = 0;
        adventures.forEach(adv => {
            if (!adv?.id || !Array.isArray(adv.scenes)) return;
            try {
                const filePath = store.uniquePath(targetDir, store.sanitizeFileName(adv.name));
                fs.mkdirSync(targetDir, { recursive: true });
                store.createFile(filePath, adv);
                store.upsertEntry(filePath, adv);
                converted++;
            } catch (e) {
                console.error('Falha ao converter aventura', adv.name, e);
            }
        });

        if (converted > 0) {
            const lib = store.loadLibrary();
            lib.migrationNotice = { count: converted, folder: targetDir };
            store.saveLibrary(lib);
        }
        fs.writeFileSync(marker, oldDir);
        console.log(`Migração concluída: ${converted} aventuras de ${oldDir}`);
    } catch (e) {
        console.error('Falha na migração dos dados antigos:', e);
    }
};

module.exports = { migrateLegacyData };
