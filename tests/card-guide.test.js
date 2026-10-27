import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadCatalog } from '../decks/catalog.js';
import { GLOSSARY, glossaryHtml, heatSummary, highlightKeywords, propertyBadge } from '../apps/play-web/card-guide.js';

const catalog = await loadCatalog(async (url) => JSON.parse(await readFile(url, 'utf8')));

test('all 30 displayed cards have detailed deck-owned descriptions and heat curves', () => {
  const cards = Object.values(catalog.cards).filter((card) => !card.system);
  assert.equal(cards.length, 30);
  for (const card of cards) {
    assert.ok(card.text.length >= 80, card.id);
    assert.ok(heatSummary(card, 80).includes('At 80°C:'), card.id);
    assert.ok(card.text.includes('°C') || /at any heat|at very high heat|at high heat|at cool heat|heat cutoff/i.test(card.text), card.id);
  }
});

test('the glossary explains effective property, React, and Acid 2 without changing score rules', () => {
  assert.match(GLOSSARY.React, /property.*React.*presence/i);
  assert.match(GLOSSARY.Acid, /90°C\+/);
  assert.match(GLOSSARY.Reaction, /weaker required property/);
  assert.match(propertyBadge('acid', 2, 1.2), /2\.40 effective Acid/);
  assert.match(highlightKeywords('Acid 2 and React ×1.2 trigger Extraction.'), /term-acid/);
  assert.match(highlightKeywords('Acid 2 and React ×1.2 trigger Extraction.'), /term-rule/);
  assert.match(glossaryHtml(), /Card stats/);
});
