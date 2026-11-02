// Nome e versão do programa, lidos do package.json (única fonte da verdade).
import pkg from '../../package.json';

export const APP_NAME = pkg.productName;
export const APP_VERSION = `v${pkg.version}`;
