import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';

const root = new URL('../', import.meta.url);
const entries = {};
const files = {
  'ui/index.html': 'dist/index.html',
  'ui/script.js': 'dist/script.js',
  'ui/style.css': 'dist/style.css',
  'ui/locale.json': 'dist/locale.json',
  'locales/en.json': 'locales/en.json',
  'locales/fr.json': 'locales/fr.json',
  'INSTALL.md': 'INSTALL.md',
  'LICENSE': 'LICENSE',
  'THIRD_PARTY_NOTICES.md': 'THIRD_PARTY_NOTICES.md',
};

// Explicit contents keep sources, screenshots and PMMS's libraries out of downloads.
for (const [entry, file] of Object.entries(files)) {
  const content = readFileSync(new URL(file, root));
  if (!content.length) throw new Error(`Cannot package an empty file: ${file}`);
  entries[entry] = content;
}

const archive = zipSync(entries, { level: 9, mtime: new Date(1980, 0, 1) });
const hash = createHash('sha256').update(archive).digest('hex');
mkdirSync(new URL('artifacts/', root), { recursive: true });
writeFileSync(new URL('artifacts/pmms-ui.zip', root), archive);
writeFileSync(new URL('artifacts/pmms-ui.zip.sha256', root), `${hash}  pmms-ui.zip\n`);
console.log(`Created artifacts/pmms-ui.zip (${(archive.length / 1024).toFixed(1)} KiB)`);
