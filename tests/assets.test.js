import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { loadCatalog } from '../decks/catalog.js';
import { POTS } from '../packages/game-core/index.js';
import { STORIES } from '../stories/catalog.js';

const catalog = await loadCatalog(async (url) => JSON.parse(await readFile(url, 'utf8')));

test('every ingredient, residue and pot has a nonempty PNG image', async () => {
  const files = [
    ...Object.values(catalog.cards).map((card) => `../assets/ingredients/${card.imageId ?? card.id}.png`),
    ...Object.values(catalog.residues).map((residue) => `../assets/residues/${residue.imageId ?? residue.id}.png`),
    ...POTS.map((pot) => `../assets/pots/${pot.id}.png`),
    ...[...new Set(STORIES.flatMap((story) => story.chapters.map((chapter) => chapter.portrait)))].map((id) => `../assets/characters/${id}.png`)
  ];
  assert.equal(files.length, 61);
  await Promise.all(files.map(async (file) => {
    const url = new URL(file, import.meta.url);
    await access(url);
    const data = await readFile(url);
    assert.ok(data.byteLength > 1000, `${file} is unexpectedly small`);
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} is not a PNG`);
    assert.ok(data.readUInt32BE(16) >= 128 && data.readUInt32BE(20) >= 128, `${file} has invalid dimensions`);
  }));
});
