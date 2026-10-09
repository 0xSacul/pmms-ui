import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';

const root = new URL('../', import.meta.url);
const archive = readFileSync(new URL('artifacts/pmms-ui.zip', root));
const entries = unzipSync(archive);
const expected = [
  'ui/index.html', 'ui/script.js', 'ui/style.css', 'ui/locale.json',
  'locales/en.json', 'locales/fr.json', 'INSTALL.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
];
assert.deepEqual(Object.keys(entries).sort(), expected.sort(), 'Unexpected release contents');
for (const file of expected) assert.ok(entries[file].length, `Empty release file: ${file}`);
const english = JSON.parse(strFromU8(entries['locales/en.json']));
const french = JSON.parse(strFromU8(entries['locales/fr.json']));
assert.deepEqual(JSON.parse(strFromU8(entries['ui/locale.json'])), english);
assert.deepEqual(Object.keys(english).sort(), Object.keys(french).sort());
const html = strFromU8(entries['ui/index.html']);
assert.match(html, /src="\.\/script\.js"/);
assert.match(html, /href="\.\/style\.css"/);
assert.match(html, /src="\.\/mediaelement\.min\.js"/);
assert.match(html, /src="\.\/wave\.js"/);
assert.doesNotMatch(html, /src="\/src\//);
assert.match(strFromU8(entries['ui/script.js']), /Svelte runtime license/);
assert.equal(
  readFileSync(new URL('artifacts/pmms-ui.zip.sha256', root), 'utf8').trim(),
  `${createHash('sha256').update(archive).digest('hex')}  pmms-ui.zip`,
);
console.log('Verified release contents, locale keys, runtime paths and SHA-256 checksum.');
