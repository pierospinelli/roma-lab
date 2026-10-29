/** Produce a self-contained static site for GitHub Pages and GitLab Pages.
 * Usage: node prepare-pages.mjs [output-directory]
 * The output does not need Node.js or a backend at runtime.
 */
import { cp, mkdir, readdir, rm, stat, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));
const destination = resolve(source, process.argv[2] || 'public');
const copied = ['index.html', 'css', 'js/cesium-app.js', 'js/data.js',
  'js/districts.geojson', 'js/roads.js', 'js/transit.js', 'js/names.js', 'vendor/cesium'];
if (destination === source || !destination.startsWith(source + sep)) {
  throw Error('La directory di pubblicazione deve essere una sottodirectory del progetto.');
}
// Only replace the known generated output directory, never a source folder.
if (!['public', 'dist'].includes(relative(source, destination))) {
  throw Error('Directory di pubblicazione consentite: public oppure dist.');
}
try {
  const marker = await readFile(join(destination, '.roma-lab-generated'), 'utf8');
  if (marker !== 'Roma Lab: generated deployment folder\n') throw Error('Marker non valido.');
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  try {
    await stat(destination);
    throw Error(`La cartella ${destination} esiste già e non è una distribuzione generata: non sarà sovrascritta.`);
  } catch (check) {
    if (check.code !== 'ENOENT') throw check;
  }
}
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const name of copied) {
  const target = join(destination, name);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(source, name), target, { recursive: true });
}
await writeFile(join(destination, '.nojekyll'), '');
await writeFile(join(destination, '.roma-lab-generated'), 'Roma Lab: generated deployment folder\n');
const files = await readdir(destination);
if (!files.includes('index.html') || !(await stat(join(destination, 'index.html'))).size) {
  throw Error('index.html mancante nella distribuzione.');
}
console.log(`Roma Lab: distribuzione statica pronta in ${destination}`);
