import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'dist');
const marker = join(output, '.stew-generated');
const signature = 'Forever Stew generated static site\n';
const allowed = new Set(['.html', '.js', '.css', '.json', '.png', '.svg', '.webp', '.jpg', '.jpeg', '.ico', '.woff', '.woff2']);

// Only replace our own generated folder, never an arbitrary existing directory.
try {
  const previous = await readdir(output);
  if (previous.length && await readFile(marker, 'utf8').catch(() => '') !== signature) {
    throw new Error('Refusing to replace dist: it is not a recognized generated Stew site');
  }
  if (resolve(output) !== join(root, 'dist')) throw new Error('Unsafe build destination');
  await rm(output, { recursive: true, force: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir(output, { recursive: true });
await writeFile(marker, signature);
let count = 0;
async function copyStatic(relative) {
  const entries = await readdir(join(root, relative), { withFileTypes: true });
  for (const entry of entries) {
    const child = join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Do not publish symbolic links: ${child}`);
    if (entry.isDirectory()) await copyStatic(child);
    else if (allowed.has(extname(entry.name))) await copyFile(child);
  }
}
async function copyFile(relative) {
  const target = join(output, relative);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(root, relative), target);
  count++;
}
for (const file of ['index.html', 'styles.css']) await copyFile(file);
for (const directory of ['apps/play-web', 'packages/game-core', 'packages/deck-contract', 'decks', 'stories', 'assets']) await copyStatic(directory);
await writeFile(join(output, '.nojekyll'), '');
console.log(`Built ${count} static files in ${output}. No design documents, tests, tools or credentials are published.`);
