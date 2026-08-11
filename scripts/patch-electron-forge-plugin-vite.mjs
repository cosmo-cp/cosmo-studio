import fs from 'node:fs';
import path from 'node:path';

const patchTargets = [
    'node_modules/@electron-forge/plugin-vite/dist/config/vite.preload.config.js',
    'node_modules/@electron-forge/plugin-vite/src/config/vite.preload.config.ts',
];

const deprecatedSetting = 'inlineDynamicImports: true,';
const replacementSetting = 'codeSplitting: false,';

function patchFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    const source = fs.readFileSync(filePath, 'utf8');
    if (source.includes(replacementSetting)) {
        return true;
    }

    if (!source.includes(deprecatedSetting)) {
        return false;
    }

    const patchedSource = source.replace(deprecatedSetting, replacementSetting);
    fs.writeFileSync(filePath, patchedSource);
    return true;
}

let patchedAnyFile = false;
for (const target of patchTargets) {
    const absolutePath = path.resolve(process.cwd(), target);
    patchedAnyFile = patchFile(absolutePath) || patchedAnyFile;
}

if (patchedAnyFile) {
    console.log('Patched @electron-forge/plugin-vite preload config for Vite 8.');
}
