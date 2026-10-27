import * as pantryRules from './pantry/rules.js';
import * as cultureRules from './culture/rules.js';
import * as hearthRules from './hearth/rules.js';
import * as chorusRules from './chorus/rules.js';
import * as pantryPresentation from './pantry/presentation.js';
import * as culturePresentation from './culture/presentation.js';
import * as hearthPresentation from './hearth/presentation.js';
import * as chorusPresentation from './chorus/presentation.js';
import { STOCKS } from '../packages/game-core/stocks.js';
import { RESIDUE_METRICS } from '../packages/game-core/residue-objectives.js';

export const deckSources = [
  { id: 'pantry', url: new URL('./pantry/deck.json', import.meta.url), rules: pantryRules, presentation: pantryPresentation },
  { id: 'culture', url: new URL('./culture/deck.json', import.meta.url), rules: cultureRules, presentation: culturePresentation },
  { id: 'hearth', url: new URL('./hearth/deck.json', import.meta.url), rules: hearthRules, presentation: hearthPresentation },
  { id: 'chorus', url: new URL('./chorus/deck.json', import.meta.url), rules: chorusRules, presentation: chorusPresentation }
];

const PROPERTIES = new Set(['protein', 'fat', 'sugar', 'acid', 'aromatic', 'mineral']);

function assert(condition, message) {
  if (!condition) throw new Error(`Invalid deck package: ${message}`);
}

export async function loadCatalog(readJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: ${response.status}`);
  return response.json();
}) {
  const decks = {};
  const cards = {};
  const residues = {};
  for (const source of deckSources) {
    const definition = await readJson(source.url);
    assert(definition.id === source.id, `${source.id}: manifest ID`);
    assert(definition.schemaVersion === 1, `${source.id}: schema version`);
    assert(Array.isArray(definition.cards) && definition.cards.length > 0, `${source.id}: cards`);
    assert(typeof source.presentation.cardDescriptions === 'object', `${source.id}: card descriptions`);
    assert(Array.isArray(definition.residues), `${source.id}: residues`);
    assert(typeof source.rules.handlers === 'object', `${source.id}: rules handlers`);
    const deck = { ...definition, rules: source.rules, presentation: source.presentation };
    decks[deck.id] = deck;
    for (const residue of deck.residues) {
      assert(residue.id.startsWith(`${deck.id}.`), `${residue.id}: namespace`);
      assert(!residues[residue.id], `${residue.id}: duplicate residue`);
      assert(residue.maxTier === 2, `${residue.id}: tier limit must be 2`);
      assert(residue.objective && RESIDUE_METRICS.includes(residue.objective.metric) && Number.isInteger(residue.objective.target) && residue.objective.target > 0 && typeof residue.objective.text === 'string', `${residue.id}: objective`);
      residues[residue.id] = { ...residue, deckId: deck.id };
    }
    for (const card of deck.cards) {
      assert(card.id.startsWith(`${deck.id}.`) && !cards[card.id], `${card.id}: ID/namespace`);
      assert(Number.isFinite(card.basePower) && card.basePower >= 0, `${card.id}: base power`);
      assert(Number.isFinite(card.volume) && card.volume > 0, `${card.id}: volume`);
      assert(Number.isFinite(card.reactivity) && card.reactivity > 0, `${card.id}: reactivity`);
      assert(['common', 'uncommon', 'rare'].includes(card.rarity), `${card.id}: rarity`);
      assert(residues[card.residueId]?.deckId === deck.id, `${card.id}: residue reference`);
      assert(typeof deck.presentation.cardDescriptions[card.id] === 'string' && deck.presentation.cardDescriptions[card.id].length >= 80, `${card.id}: detailed description`);
      assert(Array.isArray(card.tags), `${card.id}: tags`);
      assert(Array.isArray(card.temperature) && card.temperature.length >= 2, `${card.id}: curve`);
      let previous = -1;
      for (const [temperature, multiplier] of card.temperature) {
        assert(Number.isFinite(temperature) && temperature > previous && temperature >= 0 && temperature <= 120, `${card.id}: curve order`);
        assert(Number.isFinite(multiplier) && multiplier >= 0, `${card.id}: curve multiplier`);
        previous = temperature;
      }
      for (const [property, amount] of Object.entries(card.properties)) {
        assert(PROPERTIES.has(property) && Number.isFinite(amount) && amount > 0, `${card.id}: property ${property}`);
      }
      cards[card.id] = { ...card, text: deck.presentation.cardDescriptions[card.id], deckId: deck.id };
    }
  }
  for (const deck of Object.values(decks)) {
    for (const id of deck.openingIds ?? []) assert(cards[id]?.deckId === deck.id, `${deck.id}: opening card ${id}`);
  }
  cards['pantry.broth'] = {
    id: 'pantry.broth', deckId: 'pantry', system: true, name: 'Pot Broth', type: 'Broth',
    basePower: 18, volume: 0, reactivity: 1, properties: { sugar: 0.25, acid: 0.25, aromatic: 0.25, protein: 0.25, mineral: 0.25 },
    tags: [], temperature: [[0, 1], [120, 1]], text: 'Remnants below 0.15 presence join this shared broth. Fixed 0.25 Sugar, Acid, Aromatic, Protein, and Mineral; no Fat. Power 18 at 0.6 L or more, proportionally less below that. Serving reduces its volume. Cannot fuel a furnace.'
  };
  for (const stock of STOCKS) cards[stock.id] = stock;
  return { version: '0.2.0', decks, cards, residues };
}
