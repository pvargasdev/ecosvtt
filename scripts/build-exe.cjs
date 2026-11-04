// Gera o executável (electron-builder com a configuração do package.json) com um
// ajuste no modelo do executável portátil: a imagem de abertura (assets/splash.bmp)
// fica na tela até a primeira janela do EcosVTT aparecer. O modelo original fecha a
// imagem antes de iniciar o programa e, como o antivírus costuma segurar o .exe
// recém-extraído por alguns segundos, ficava um intervalo sem nada na tela.
//
// O electron-builder não permite trocar esse modelo, então ele é ajustado só em
// memória, durante este build (nada em node_modules é alterado).

const path = require('path');

const appBuilderLib = path.dirname(require.resolve('app-builder-lib/package.json'));
const fsExtra = require(require.resolve('fs-extra', { paths: [appBuilderLib] }));
const TEMPLATE_SUFFIX = path.join('templates', 'nsis', 'portable.nsi');

const ORIGINAL = [
    '  !ifdef SPLASH_IMAGE',
    '    BgImage::Destroy',
    '  !endif',
    '',
    '\tExecWait "$INSTDIR\\${APP_EXECUTABLE_FILENAME} $R0" $0',
    '  SetErrorLevel $0'
].join('\n');

// Inicia o programa sem esperar, aguarda (até 2 min) uma janela visível dele ou o
// processo terminar, fecha a imagem e só então espera o programa encerrar.
const PATCHED = [
    '  !ifdef SPLASH_IMAGE',
    '    ${StdUtils.ExecShellWaitEx} $R1 $R2 "$INSTDIR\\${APP_EXECUTABLE_FILENAME}" "open" "$R0"',
    '    ${if} $R1 == "ok"',
    '      StrCpy $R3 0',
    '      ${do}',
    '        StrCpy $R6 0',
    '        StrCpy $R4 0',
    '        ${do}',
    '          FindWindow $R4 "Chrome_WidgetWin_1" "${PRODUCT_NAME}" 0 $R4',
    '          ${if} $R4 == 0',
    '            ${break}',
    '          ${endif}',
    "          System::Call 'user32::IsWindowVisible(p R4) i .R7'",
    '          ${if} $R7 != 0',
    '            StrCpy $R6 1',
    '            ${break}',
    '          ${endif}',
    '        ${loop}',
    '        ${if} $R6 == 1',
    '          ${break}',
    '        ${endif}',
    "        System::Call 'kernel32::WaitForSingleObject(p R2, i 0) i .R5'",
    '        ${if} $R5 == 0',
    '          ${break}',
    '        ${endif}',
    '        Sleep 100',
    '        IntOp $R3 $R3 + 100',
    '      ${loopuntil} $R3 >= 120000',
    '      BgImage::Destroy',
    '      ${StdUtils.WaitForProcEx} $0 $R2',
    '    ${else}',
    '      BgImage::Destroy',
    '      ExecWait "$INSTDIR\\${APP_EXECUTABLE_FILENAME} $R0" $0',
    '    ${endif}',
    '  !else',
    '    ExecWait "$INSTDIR\\${APP_EXECUTABLE_FILENAME} $R0" $0',
    '  !endif',
    '  SetErrorLevel $0'
].join('\n');

const patchTemplate = (source) => {
    const text = source.replace(/\r\n/g, '\n');
    if (!text.includes(ORIGINAL)) throw new Error('portable.nsi: trecho esperado não encontrado (o electron-builder mudou?)');
    return text.replace(ORIGINAL, PATCHED);
};

const originalReadFile = fsExtra.readFile;
fsExtra.readFile = function (file, ...args) {
    if (typeof file === 'string' && file.endsWith(TEMPLATE_SUFFIX)) {
        return originalReadFile.call(this, file, 'utf8').then(patchTemplate);
    }
    return originalReadFile.call(this, file, ...args);
};

require('electron-builder').build().then(
    (files) => { console.log('ok:', files.join(', ')); },
    (err) => { console.error(err); process.exit(1); }
);
