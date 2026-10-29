import { effectiveProperty, oldest, operational, residueTier } from '../deck-contract/helpers.js';

import { STORIES, getStory, getEncounter } from '../../stories/catalog.js';
import { STOCKS, SERVING_SIZES, servingSize } from './stocks.js';
import { advanceResidues, servingMetrics } from './residue-objectives.js';
export { STORIES, getStory, getEncounter, STOCKS, SERVING_SIZES, servingSize };

export const RULES_VERSION = 7;
export const SERVING_VOLUME = 0.4;
export const BROTH_CARD_ID = 'pantry.broth';
export const BROTH_CUTOFF = 0.15;
export const POTS = [
  { id: 'iron', name: 'Iron Cauldron', capacity: 3, residueSlots: 7, text: '3 L · seven residue slots. Concentrated scoring and many upgrades; less room for ingredients. Standard bowls retain 86.7% presence.' },
  { id: 'royal', name: 'Royal Stockpot', capacity: 5, residueSlots: 5, text: '5 L · five residue slots. Room for a wider engine and slower decay. Standard bowls retain 92% presence. Choose any story with either pot.' }
];
// Compatibility export for tools inspecting the default story, not a pot route.
export const ENCOUNTERS = STORIES[0].chapters;

export const REACTIONS = [
  { id: 'core.browning', name: 'Browning', needs: ['protein', 'sugar'], min: 70, max: 110, effect: { protein: 0.25, sugar: 0.25 } },
  { id: 'core.infusion', name: 'Infusion', needs: ['fat', 'aromatic'], min: 40, max: 100, effect: { fat: 0.1, aromatic: 0.2 } },
  { id: 'core.extraction', name: 'Extraction', needs: ['acid', 'mineral'], min: 50, max: 120, effect: { mineral: 0.4 } },
  { id: 'core.preservation', name: 'Preservation', needs: ['acid', 'sugar'], min: 0, max: 60, effect: { acid: 0.15, sugar: 0.15 } }
];

const RARITY_WEIGHT = { common: 5, uncommon: 3, rare: 1 };
const RESIDUE_RARITY_WEIGHT = { common: 12, uncommon: 5, rare: 1.5, 'ultra-rare': .35 };
const MAX_EVENTS = 256;
const EPSILON = 1e-9;

function copy(value) { return structuredClone(value); }

function fail(message) { throw new Error(message); }

function ensure(condition, message) { if (!condition) fail(message); }

function number(value, label, min = -Infinity, max = Infinity) {
  ensure(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, `Invalid ${label}`);
  return value;
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) freeze(entry);
  }
  return value;
}

function random(state) {
  let x = state.rng >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.rng = x >>> 0;
  return state.rng / 0x100000000;
}

function weightedChoice(state, cards) {
  const total = cards.reduce((sum, card) => sum + RARITY_WEIGHT[card.rarity], 0);
  ensure(total > 0, 'No available ingredient offers');
  let draw = random(state) * total;
  for (const card of cards) {
    draw -= RARITY_WEIGHT[card.rarity];
    if (draw < 0) return card;
  }
  return cards.at(-1);
}

function appendEvent(state, events, type, phase, sourceId, targetIds = [], data = {}, parentIds = []) {
  ensure(events.length < MAX_EVENTS, 'Resolution event budget exceeded');
  const event = { id: `e${++state.nextEvent}`, type, phase, sourceId, targetIds, parentIds, data };
  events.push(event);
  return event;
}

export function activeDeckIds(state, catalog) {
  const ids = new Set([...state.deckIds, ...state.contents.map((entry) => catalog.cards[entry.cardId].deckId),
    ...state.residues.map((entry) => catalog.residues[entry.id].deckId),
    ...Object.keys(state.deckState).filter((id) => Object.values(state.deckState[id].resources).some((value) => value > 0))]);
  return ['pantry', ...[...ids].filter((id) => id !== 'pantry').sort()];
}
function activeDecks(state, catalog) { return activeDeckIds(state, catalog).map((id) => catalog.decks[id]); }

function offerFrom(state, catalog, candidates, chosen) {
  const available = candidates.filter((card) => !chosen.includes(card.id));
  return weightedChoice(state, available).id;
}

function generateOffers(state, catalog, events) {
  const included = new Set(state.deckIds);
  const foragedOpening = state.storyId === 'road' && state.encounterIndex === 0;
  const all = Object.values(catalog.cards).filter((card) => included.has(card.deckId) && !card.system &&
    (!foragedOpening || ['Fungus', 'Fruit', 'Vegetable', 'Spice'].includes(card.type)));
  ensure(all.length >= 3, 'Offer pool needs at least three ingredients');
  const selected = [];
  const themes = state.deckIds.filter((id) => id !== 'pantry');
  for (const deckId of themes) {
    const deck = catalog.decks[deckId];
    let pool = all.filter((card) => card.deckId === deckId);
    if (state.encounterIndex === 0 && state.round === 0) {
      pool = pool.filter((card) => deck.openingIds.includes(card.id));
    }
    selected.push(offerFrom(state, catalog, pool, selected));
  }
  if (themes.length === 2 && selected.length < 3) {
    selected.push(offerFrom(state, catalog, all.filter((card) => card.deckId === 'pantry'), selected));
  }
  while (selected.length < 3) selected.push(offerFrom(state, catalog, all, selected));
  if (getEncounter(state).boss?.kind === 'princess') {
    const outsiders = Object.values(catalog.cards).filter((card) => !card.system && !included.has(card.deckId));
    const pool = outsiders.length ? outsiders : all.filter((card) => !selected.includes(card.id));
    const gift = weightedChoice(state, pool).id;
    const slot = Math.floor(random(state) * 3);
    selected[slot] = gift;
    state.bossTurn.giftCardId = gift;
    state.bossTurn.giftSlot = slot;
  }
  state.offers = selected;
  appendEvent(state, events, 'offersGenerated', 'offerGeneration', 'core.pantry', selected, { offers: selected });
}

// Prepare randomness once, before player input. Preview never rerolls the
// current request, curse or locked temperature.
function prepareTurn(state, catalog, events) {
  state.disabledResidueIds = [];
  state.bossTurn = { forcedHeat: null, giftCardId: null };
  const boss = getEncounter(state).boss;
  if (boss?.kind === 'witch' && state.residues.length) {
    const available = [...state.residues];
    for (let i = 0; i < Math.min(boss.muteCount, state.residues.length); i++) {
      const index = Math.floor(random(state) * available.length);
      state.disabledResidueIds.push(available.splice(index, 1)[0].id);
    }
  }
  if (boss?.kind === 'dragon' && boss.heatRounds.includes(state.round)) {
    state.bossTurn.forcedHeat = boss.heatChoices[Math.floor(random(state) * boss.heatChoices.length)];
    state.temperature = state.bossTurn.forcedHeat;
  }
  if (boss?.requiredSize) state.servingSize = boss.requiredSize;
  appendEvent(state, events, 'turnPrepared', 'encounter', getEncounter(state).id, [], {
    round: state.round, forcedHeat: state.bossTurn.forcedHeat, disabledResidueIds: [...state.disabledResidueIds]
  });
  generateOffers(state, catalog, events);
}

function chooseStock(state, catalog, action, events) {
  ensure(state.phase === 'stock', 'Starting stock has already been chosen');
  ensure(state.stockOffers.includes(action.stockId), 'Choose one of the three offered stocks');
  state.contents.push({ instanceId: `i${++state.nextInstance}`, cardId: action.stockId, presence: 1, addedAt: state.nextInstance });
  state.stockId = action.stockId;
  state.stockOffers = [];
  state.phase = 'chapter';
  appendEvent(state, events, 'stockChosen', 'setup', action.stockId, [state.contents[0].instanceId], { name: catalog.cards[action.stockId].name });
}

function startChapter(state, catalog, events) {
  ensure(state.phase === 'chapter', 'No chapter introduction is waiting');
  state.phase = 'serving';
  runEncounterStart(state, catalog, events);
  appendEvent(state, events, 'encounterStarted', 'encounterStart', getEncounter(state).id, [], { encounterIndex: state.encounterIndex });
  prepareTurn(state, catalog, events);
}

function getPot(state) { return POTS.find((pot) => pot.id === state.potId); }

export function encounterTarget(state) {
  return getEncounter(state).target;
}

export function starThresholds(encounter) {
  // Aspirational gaps grow in absolute points without becoming impossible in
  // late chapters, whose pass targets already scale sharply with the story.
  return [encounter.target, Math.ceil(encounter.target + 10 * Math.sqrt(encounter.target)), Math.ceil(encounter.target + 26 * Math.sqrt(encounter.target))];
}

export function earnedStars(state) {
  const [pass, skilled, engine] = starThresholds(getEncounter(state));
  if (state.score + EPSILON < pass || (getEncounter(state).boss?.requiredTypes && state.encounterTypes.length < getEncounter(state).boss.requiredTypes)) return 0;
  const sources = state.encounterPulseSources?.length ?? 0;
  return state.score >= engine && (state.encounterMaxConcurrentSources ?? 0) >= 2 ? 3 : state.score >= skilled && sources >= 1 ? 2 : 1;
}

export function occupiedVolume(entry, catalog) {
  return entry.cardId === BROTH_CARD_ID ? entry.volume : catalog.cards[entry.cardId].volume * entry.presence;
}

export function temperatureMultiplier(card, temperature) {
  const curve = card.temperature;
  if (temperature <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [rightTemperature, rightValue] = curve[i];
    const [leftTemperature, leftValue] = curve[i - 1];
    if (temperature <= rightTemperature) return leftValue + (temperature - leftTemperature) * (rightValue - leftValue) / (rightTemperature - leftTemperature);
  }
  return curve.at(-1)[1];
}

export function inspectReactions(state, catalog) {
  const reactions = REACTIONS.map((reaction) => {
    const inputs = Object.fromEntries(reaction.needs.map((need) => [need, effectiveProperty(state, catalog, need)]));
    const strength = Math.min(...Object.values(inputs));
    return { ...reaction, inputs, strength, multiplier: 1, modifiers: [], active: state.temperature >= reaction.min && state.temperature <= reaction.max && strength > 0 };
  });
  const priorities = [];
  for (const deck of activeDecks(state, catalog)) {
    if (!deck.rules.reactionPlan) continue;
    const plan = deck.rules.reactionPlan(freeze({ state: copy(state), cards: catalog.cards, residues: catalog.residues }));
    ensure(Array.isArray(plan), `${deck.id}: invalid reaction plan`);
    for (const operation of plan) {
      ensure(typeof operation.sourceId === 'string' && operation.sourceId.startsWith(`${deck.id}.`), `${deck.id}: reaction source namespace`);
      const reaction = reactions.find((entry) => entry.id === operation.reactionId);
      ensure(reaction, `${deck.id}: unknown reaction`);
      if (operation.kind === 'lead') {
        if (!priorities.includes(reaction.id)) { priorities.push(reaction.id); reaction.orderSource = operation.sourceId; }
      } else {
        ensure(operation.kind === 'amplify', `${deck.id}: invalid reaction operation`);
        number(operation.factor, 'reaction multiplier', 1, 10);
        reaction.multiplier *= operation.factor;
        reaction.modifiers.push({ sourceId: operation.sourceId, factor: operation.factor });
      }
    }
  }
  return reactions.sort((a, b) => {
    const rank = (reaction) => priorities.includes(reaction.id) ? priorities.indexOf(reaction.id) : priorities.length + REACTIONS.findIndex((entry) => entry.id === reaction.id);
    return rank(a) - rank(b);
  });
}

function forServing(catalog, state, events, pendingOriginal) {
  const retention = {};
  const originalPulses = [];
  const derivedPulses = [];

  function applyIntent(deck, phase, intent) {
    ensure(intent && typeof intent === 'object', `${deck.id}: rule returned an invalid operation`);
    ensure(typeof intent.sourceId === 'string' && intent.sourceId.startsWith(`${deck.id}.`), `${deck.id}: source must be namespaced`);
    const sourceId = intent.sourceId;
    if (intent.kind === 'resource') {
      ensure(phase === 'preServe' || phase === 'encounterStart', `${deck.id}: resource phase`);
      ensure(Object.hasOwn(deck.rules.resourceCaps ?? {}, intent.resource), `${deck.id}: undeclared resource`);
      const before = state.deckState[deck.id].resources[intent.resource] ?? 0;
      const cap = deck.rules.resourceCaps[intent.resource];
      const after = before + number(intent.amount, 'resource change');
      number(after, `${deck.id}.${intent.resource}`, 0, cap);
      state.deckState[deck.id].resources[intent.resource] = after;
      appendEvent(state, events, 'resourceChanged', phase, sourceId, intent.targetIds ?? [], { resource: intent.resource, before, after, delta: intent.amount, label: intent.label ?? '' });
      return;
    }
    if (intent.kind === 'flag') {
      ensure(phase === 'preServe' || phase === 'derived' || phase === 'encounterStart', `${deck.id}: flag phase`);
      ensure(typeof intent.key === 'string' && /^[a-z][a-zA-Z0-9]*$/.test(intent.key), `${deck.id}: flag key`);
      number(intent.value, `${deck.id}: flag`, 0, 100);
      state.deckState[deck.id].flags[intent.key] = intent.value;
      return;
    }
    if (intent.kind === 'consume') {
      ensure(phase === 'preServe' || phase === 'derived', `${deck.id}: consumption phase`);
      const target = state.contents.find((entry) => entry.instanceId === intent.targetId);
      ensure(target, `${deck.id}: missing consumption target`);
      number(intent.amount, `${deck.id}: presence cost`, 0, target.presence + EPSILON);
      const before = target.presence;
      target.presence = Math.max(0, before - intent.amount);
      appendEvent(state, events, 'presenceConsumed', phase, sourceId, [target.instanceId], { amount: intent.amount, before, after: target.presence });
      return;
    }
    if (intent.kind === 'retention') {
      ensure(phase === 'preServe', `${deck.id}: retention phase`);
      ensure(state.contents.some((entry) => entry.instanceId === intent.targetId), `${deck.id}: missing retention target`);
      number(intent.fraction, `${deck.id}: retention fraction`, 0, 1);
      retention[intent.targetId] = Math.max(retention[intent.targetId] ?? 0, intent.fraction);
      appendEvent(state, events, 'retentionRequested', phase, sourceId, [intent.targetId], { fraction: intent.fraction });
      return;
    }
    if (intent.kind === 'pulse') {
      ensure(phase === 'preServe' || phase === 'derived', `${deck.id}: pulse phase`);
      ensure(intent.origin === (phase === 'preServe' ? 'original' : 'derived'), `${deck.id}: pulse origin`);
      ensure(Array.isArray(intent.deltas) && intent.deltas.length > 0, `${deck.id}: empty pulse`);
      const targetIds = new Set(state.contents.map((entry) => entry.instanceId));
      const deltas = intent.deltas.map((delta) => {
        ensure(targetIds.has(delta.instanceId), `${deck.id}: invalid pulse target`);
        number(delta.amount, `${deck.id}: pulse delta`, 0, 1000000);
        return { instanceId: delta.instanceId, amount: delta.amount };
      });
      const participantIds = intent.participantIds ?? deltas.map((delta) => delta.instanceId);
      ensure(Array.isArray(participantIds) && participantIds.every((id) => targetIds.has(id)), `${deck.id}: invalid pulse participant`);
      const pulse = { sourceId, origin: intent.origin, echoable: intent.origin === 'original' && intent.echoable === true, deltas, participantIds: [...new Set(participantIds)], parentIds: intent.parentIds ?? [] };
      if (phase === 'preServe') pendingOriginal.push(pulse);
      else {
        const event = appendEvent(state, events, 'reactionPulse', 'derived', sourceId, deltas.map((delta) => delta.instanceId), { origin: 'derived', echoable: false, deltas, participantIds: pulse.participantIds, total: deltas.reduce((sum, delta) => sum + delta.amount, 0) }, pulse.parentIds);
        derivedPulses.push({ ...pulse, eventId: event.id });
      }
      return;
    }
    fail(`${deck.id}: unknown operation ${intent.kind}`);
  }

  function runHandlers(phase) {
    for (const deck of activeDecks(state, catalog)) {
      const handler = deck.rules.handlers[phase];
      if (!handler) continue;
      const context = freeze({ state: copy(state), cards: catalog.cards, residues: catalog.residues, originalPulses: copy(originalPulses) });
      const intents = handler(context);
      ensure(Array.isArray(intents), `${deck.id}: handler must return operations`);
      for (const intent of intents) applyIntent(deck, phase, intent);
    }
  }

  function addOriginalPulse(pulse, entryScores, kind) {
    const event = appendEvent(state, events, 'reactionPulse', 'original', pulse.sourceId, pulse.deltas.map((delta) => delta.instanceId), {
      origin: 'original', echoable: pulse.echoable, deltas: pulse.deltas, modifiers: pulse.modifiers ?? [], orderSource: pulse.orderSource ?? null, participantIds: pulse.participantIds ?? pulse.deltas.map((delta) => delta.instanceId), total: pulse.deltas.reduce((sum, delta) => sum + delta.amount, 0)
    }, pulse.parentIds ?? []);
    const recorded = { ...pulse, eventId: event.id };
    originalPulses.push(recorded);
    for (const delta of pulse.deltas) {
      entryScores[delta.instanceId].raw += delta.amount;
      entryScores[delta.instanceId].contributions.push({ eventId: event.id, sourceId: pulse.sourceId, kind, amount: delta.amount });
      if (delta.amount > 0) markContribution(state, entryScores[delta.instanceId].cardId);
    }
  }

  return { retention, originalPulses, derivedPulses, runHandlers, addOriginalPulse };
}

function markContribution(state, cardId) {
  if (!state.contributedIds.includes(cardId)) state.contributedIds.push(cardId);
}

function customerMultiplier(encounter, card, temperature) {
  const modifier = encounter.modifier;
  if (modifier.kind === 'heat') return temperature > modifier.above ? modifier.multiplier : 1;
  let value = 1;
  if (card.type === modifier.bonusType) value *= modifier.bonus;
  if (card.type === modifier.penaltyType) value *= modifier.penalty;
  return value;
}

function scoreServing(state, catalog, events, resolution, pendingOriginal) {
  const pot = getPot(state);
  const scores = {};
  for (const entry of state.contents) {
    const card = catalog.cards[entry.cardId];
    const temperature = temperatureMultiplier(card, state.temperature);
    // Broth keeps fixed properties, but a vanishing puddle cannot provide
    // permanent flat base points: its power scales with volume up to 0.6 L.
    const scoringPresence = entry.cardId === BROTH_CARD_ID ? Math.min(1, entry.volume / .6) : entry.presence;
    const base = card.basePower * scoringPresence / pot.capacity * temperature;
    const baseEvent = appendEvent(state, events, 'baseScored', 'score', card.id, [entry.instanceId], { amount: base, instanceId: entry.instanceId });
    scores[entry.instanceId] = { instanceId: entry.instanceId, cardId: card.id, name: card.name, presence: entry.presence, base, temperature, raw: base, contributions: [{ eventId: baseEvent.id, sourceId: 'core.base', kind: 'base', amount: base }] };
    if (base > 0) markContribution(state, card.id);
  }
  for (const reaction of inspectReactions(state, catalog)) {
    if (!reaction.active) continue;
    const deltas = [];
    for (const entry of state.contents) {
      const card = catalog.cards[entry.cardId];
      const gain = Object.entries(reaction.effect).reduce((sum, [property, coefficient]) => sum + (card.properties[property] ? coefficient * reaction.strength : 0), 0);
      if (gain > 0) deltas.push({ instanceId: entry.instanceId, amount: scores[entry.instanceId].raw * gain * reaction.multiplier });
    }
    if (deltas.length) {
      const participantIds = state.contents.filter((entry) => reaction.needs.some((need) => catalog.cards[entry.cardId].properties[need])).map((entry) => entry.instanceId);
      for (const sourceId of [reaction.orderSource, ...reaction.modifiers.map((modifier) => modifier.sourceId)]) {
        const source = oldest(state.contents.filter((entry) => entry.cardId === sourceId && operational(entry)));
        if (source && !participantIds.includes(source.instanceId)) participantIds.push(source.instanceId);
      }
      resolution.addOriginalPulse({ sourceId: reaction.id, origin: 'original', echoable: true, deltas, modifiers: reaction.modifiers, orderSource: reaction.orderSource, participantIds, parentIds: [] }, scores, 'reaction');
    }
  }
  for (const pulse of pendingOriginal) resolution.addOriginalPulse(pulse, scores, 'deck');
  resolution.runHandlers('derived');
  for (const pulse of resolution.derivedPulses) {
    for (const delta of pulse.deltas) {
      scores[delta.instanceId].raw += delta.amount;
      scores[delta.instanceId].contributions.push({ eventId: pulse.eventId, sourceId: pulse.sourceId, kind: 'echo', amount: delta.amount });
      if (delta.amount > 0) markContribution(state, scores[delta.instanceId].cardId);
    }
  }
  const encounter = getEncounter(state);
  const residueMultiplier = 1;
  const serving = servingSize(state);
  let portionMultiplier = serving.multiplier;
  if (serving.id === 'small') portionMultiplier += .15 * (residueTier(state, 'pantry.tasting-spoon') ? 1 + (residueTier(state, 'pantry.tasting-spoon') - 1) / 7 : 0);
  const types = new Set(state.contents.filter((entry) => !catalog.cards[entry.cardId].system).map((entry) => catalog.cards[entry.cardId].type));
  if (serving.id === 'large' && types.size >= 3) portionMultiplier += .2 * (residueTier(state, 'pantry.grand-table') ? 1 + (residueTier(state, 'pantry.grand-table') - 1) / 4 : 0);
  const demandMultiplier = state.requestFulfilled ? encounter.boss.giftBonus : 1;
  const details = state.contents.map((entry) => {
    const score = scores[entry.instanceId];
    const card = catalog.cards[entry.cardId];
    const customer = customerMultiplier(encounter, card, state.temperature);
    const applicable = state.residues.filter((installed) => !state.disabledResidueIds.includes(installed.id)).map((installed) => ({ installed, definition: catalog.residues[installed.id] })).filter(({ definition }) => {
      const effect = definition.effect;
      return effect && (effect.kind === 'all' || (effect.kind === 'type' && effect.type === card.type) ||
        (effect.kind === 'size' && effect.size === serving.id) || (effect.kind === 'heat' && state.temperature >= (effect.min ?? 0) && state.temperature <= (effect.max ?? 120)));
    });
    const simpleBonus = applicable.reduce((sum, { installed, definition }) => sum + installed.tier * definition.effect.perLevel, 0);
    const adjustedResidueMultiplier = residueMultiplier + simpleBonus;
    const preResidue = score.raw * customer * portionMultiplier * demandMultiplier;
    for (const { installed, definition } of applicable) appendEvent(state, events, 'residueBonusScored', 'score', definition.id, [entry.instanceId], { amount: preResidue * installed.tier * definition.effect.perLevel, level: installed.tier, cardId: card.id });
    const total = preResidue * adjustedResidueMultiplier;
    return { ...score, customer, residueMultiplier: adjustedResidueMultiplier, servingMultiplier: portionMultiplier, demandMultiplier, total };
  });
  const total = details.reduce((sum, detail) => sum + detail.total, 0);
  number(total, 'serving score', 0, 1e12);
  state.score += total;
  state.totalScore += total;
  const effectiveProperties = Object.fromEntries(['protein', 'sugar', 'fat', 'aromatic', 'acid', 'mineral'].map((property) => [property, effectiveProperty(state, catalog, property)]));
  state.lastBreakdown = { total, details, encounterId: encounter.id, temperature: state.temperature, servingSize: serving.id, servingVolume: serving.volume,
    servingMultiplier: portionMultiplier, demandMultiplier, effectiveProperties, disabledResidueIds: [...state.disabledResidueIds] };
  appendEvent(state, events, 'scoreCalculated', 'score', 'core.score', details.map((detail) => detail.instanceId), { total, details: details.map((detail) => ({ instanceId: detail.instanceId, cardId: detail.cardId, total: detail.total })) });
  return total;
}

function applyDepletion(state, catalog, events, retention, originalPulses) {
  const volume = servingSize(state).volume;
  const ordinary = 1 - volume / getPot(state).capacity;
  const extraction = originalPulses.some((pulse) => pulse.sourceId === 'core.extraction');
  const existingBroth = state.contents.find((entry) => entry.cardId === BROTH_CARD_ID);
  if (existingBroth) {
    const before = existingBroth.volume;
    existingBroth.volume *= ordinary;
    appendEvent(state, events, 'brothServed', 'deplete', BROTH_CARD_ID, [existingBroth.instanceId], { before, after: existingBroth.volume });
  }
  let dissolvedVolume = 0;
  const retained = [];
  for (const entry of state.contents) {
    if (entry.cardId === BROTH_CARD_ID) continue;
    const before = entry.presence;
    // Retention abilities describe a standard bowl; their loss scales with
    // portion size too, so protection cannot erase the large-bowl tradeoff.
    const protectedFraction = 1 - (1 - (retention[entry.instanceId] ?? 0)) * volume / SERVING_VOLUME;
    const kept = Math.max(ordinary, protectedFraction);
    entry.presence *= kept;
    if (extraction && catalog.cards[entry.cardId].properties.acid) entry.presence *= 1 - .04 * volume / SERVING_VOLUME;
    appendEvent(state, events, 'presenceDepleted', 'deplete', 'core.serve', [entry.instanceId], { before, after: entry.presence, fraction: kept, extraction });
    if (entry.presence < BROTH_CUTOFF) {
      const volume = occupiedVolume(entry, catalog);
      dissolvedVolume += volume;
      appendEvent(state, events, 'ingredientDissolved', 'deplete', entry.cardId, [entry.instanceId, 'broth'], { name: catalog.cards[entry.cardId].name, presence: entry.presence, volume });
    } else retained.push(entry);
  }
  if (existingBroth || dissolvedVolume > 0) {
    const broth = existingBroth ?? { instanceId: 'broth', cardId: BROTH_CARD_ID, presence: 1, addedAt: 0, volume: 0 };
    const before = broth.volume;
    broth.volume += dissolvedVolume;
    if (dissolvedVolume > 0) appendEvent(state, events, 'brothEnriched', 'deplete', BROTH_CARD_ID, [broth.instanceId], { before, after: broth.volume, added: dissolvedVolume });
    if (broth.volume > EPSILON) retained.push(broth);
  }
  state.contents = retained;
}

function validateAction(state, catalog, action) {
  ensure(state.phase === 'serving', 'This run is not accepting a serving');
  ensure(action && action.type === 'serve', 'Expected a serve command');
  ensure(state.offers.includes(action.offerId), 'Choose one current offer');
  ensure(action.disposition === 'add' || action.disposition === 'discard', 'Choose add or discard');
  const sizeId = action.servingSize ?? 'standard';
  ensure(SERVING_SIZES.some((entry) => entry.id === sizeId), 'Choose small, standard or large');
  const boss = getEncounter(state).boss;
  ensure(!boss?.requiredSize || sizeId === boss.requiredSize, `This guest only accepts ${boss?.requiredSize} servings`);
  ensure(state.bossTurn?.forcedHeat == null || action.temperature === state.bossTurn.forcedHeat, `The dragon has locked this bowl to ${state.bossTurn?.forcedHeat}°C`);
  number(action.temperature, 'temperature', 0, 120);
  ensure(action.temperature % 5 === 0, 'Heat must use a 5°C step');
  if (action.disposition === 'discard') {
    ensure(!action.replaceInstanceId, 'Cannot replace an ingredient while discarding');
    return;
  }
  const card = catalog.cards[action.offerId];
  ensure(card && !card.system && (state.deckIds.includes(card.deckId) || action.offerId === state.bossTurn?.giftCardId), 'Ingredient is not in this run');
  let nextContents = state.contents;
  if (action.replaceInstanceId) {
    ensure(nextContents.some((entry) => entry.instanceId === action.replaceInstanceId), 'Choose an ingredient currently in the pot to replace');
    nextContents = nextContents.filter((entry) => entry.instanceId !== action.replaceInstanceId);
  }
  const volume = nextContents.reduce((sum, entry) => sum + occupiedVolume(entry, catalog), 0) + card.volume;
  ensure(volume <= getPot(state).capacity + EPSILON, 'Not enough pot volume: replace an ingredient or discard this offer');
}

function servingStep(state, catalog, action, events) {
  validateAction(state, catalog, action);
  state.servingSize = action.servingSize ?? 'standard';
  state.requestFulfilled = action.disposition === 'add' && action.offerId === state.bossTurn?.giftCardId;
  appendEvent(state, events, 'servingSizeChosen', 'commit', 'core.serve', [], { ...servingSize(state) });
  if (action.replaceInstanceId) {
    const removed = state.contents.find((entry) => entry.instanceId === action.replaceInstanceId);
    state.contents = state.contents.filter((entry) => entry.instanceId !== removed.instanceId);
    appendEvent(state, events, 'ingredientRemoved', 'commit', removed.cardId, [removed.instanceId], { name: catalog.cards[removed.cardId].name, presence: removed.presence });
  }
  if (action.disposition === 'add') {
    const entry = { instanceId: `i${++state.nextInstance}`, cardId: action.offerId, presence: 1, addedAt: state.nextInstance };
    state.contents.push(entry);
    appendEvent(state, events, 'ingredientAdded', 'commit', entry.cardId, [entry.instanceId], { name: catalog.cards[entry.cardId].name });
  } else {
    appendEvent(state, events, 'offerDiscarded', 'commit', action.offerId, [], { name: catalog.cards[action.offerId].name });
  }
  if (state.temperature !== action.temperature) {
    appendEvent(state, events, 'temperatureChanged', 'commit', 'core.heat', [], { before: state.temperature, after: action.temperature });
    state.temperature = action.temperature;
  }
  const pendingOriginal = [];
  const resolution = forServing(catalog, state, events, pendingOriginal);
  resolution.runHandlers('preServe');
  // Progress from size, heat, additions and pre-serve resources is awarded now,
  // before scoring. A level gained here can change this very bowl.
  const earlyMetrics = servingMetrics(state, events, { details: [], effectiveProperties: {} }, catalog);
  advanceResidues(state, catalog, earlyMetrics, (type, id, data) => appendEvent(state, events, type, 'progression', id, [], data));
  const total = scoreServing(state, catalog, events, resolution, pendingOriginal);
  const bowlSources = [...new Set(events.filter((event) => event.type === 'reactionPulse' && event.data.total > 0).map((event) => event.sourceId))];
  state.encounterPulseSources = [...new Set([...(state.encounterPulseSources ?? []), ...bowlSources])];
  state.encounterMaxConcurrentSources = Math.max(state.encounterMaxConcurrentSources ?? 0, bowlSources.length);
  const varietyGoal = getEncounter(state).boss?.requiredTypes;
  if (varietyGoal) {
    const types = state.lastBreakdown.details.filter((detail) => detail.total > 0 && !catalog.cards[detail.cardId].system)
      .map((detail) => catalog.cards[detail.cardId].type);
    const before = state.encounterTypes.length;
    state.encounterTypes = [...new Set([...state.encounterTypes, ...types])];
    appendEvent(state, events, 'bossVarietyProgress', 'score', getEncounter(state).id, [], { before, after: state.encounterTypes.length, target: varietyGoal, types: [...state.encounterTypes] });
  }
  const metrics = servingMetrics(state, events, state.lastBreakdown, catalog);
  for (const [metric, amount] of Object.entries(earlyMetrics)) metrics[metric] = Math.max(0, (metrics[metric] ?? 0) - amount);
  applyDepletion(state, catalog, events, resolution.retention, resolution.originalPulses);
  advanceResidues(state, catalog, metrics, (type, id, data) => appendEvent(state, events, type, 'progression', id, [], data));
  state.round++;
  if (state.round >= getEncounter(state).servings) {
    const target = encounterTarget(state);
    state.lastEncounterStars = earnedStars(state);
    state.chapterResults.push({ encounterId: getEncounter(state).id, score: state.score, stars: state.lastEncounterStars });
    if (!state.lastEncounterStars) {
      state.phase = 'lost';
      appendEvent(state, events, 'encounterLost', 'encounter', getEncounter(state).id, [], { score: state.score, target, stars: 0, variety: state.encounterTypes.length, requiredTypes: varietyGoal ?? 0 });
    } else if (state.encounterIndex === getStory(state).chapters.length - 1) {
      state.phase = 'won';
      appendEvent(state, events, 'runWon', 'encounter', getEncounter(state).id, [], { score: state.score, target, stars: state.lastEncounterStars });
    } else {
      state.phase = 'reward';
      const pool = eligibleResidues(state, catalog);
      state.rewardOffers = [];
      while (state.rewardOffers.length < Math.min(3, pool.length)) {
        const remaining = pool.filter((item) => !state.rewardOffers.includes(item.id));
        const totalWeight = remaining.reduce((sum, item) => sum + RESIDUE_RARITY_WEIGHT[item.rarity], 0);
        let draw = random(state) * totalWeight;
        const chosen = remaining.find((item) => (draw -= RESIDUE_RARITY_WEIGHT[item.rarity]) < 0) ?? remaining.at(-1);
        state.rewardOffers.push(chosen.id);
      }
      appendEvent(state, events, 'encounterWon', 'encounter', getEncounter(state).id, [], { score: state.score, target, stars: state.lastEncounterStars, rewardOffers: [...state.rewardOffers] });
    }
  } else prepareTurn(state, catalog, events);
  return total;
}

function runEncounterStart(state, catalog, events) {
  for (const deck of activeDecks(state, catalog)) {
    const handler = deck.rules.handlers.encounterStart;
    if (!handler) continue;
    const context = freeze({ state: copy(state), cards: catalog.cards, residues: catalog.residues, originalPulses: [] });
    const intents = handler(context);
    ensure(Array.isArray(intents), `${deck.id}: encounterStart must return operations`);
    for (const intent of intents) {
      ensure(intent.kind === 'resource' && intent.sourceId.startsWith(`${deck.id}.`), `${deck.id}: invalid encounter start operation`);
      const cap = deck.rules.resourceCaps[intent.resource];
      ensure(Number.isFinite(cap), `${deck.id}: undeclared resource`);
      const before = state.deckState[deck.id].resources[intent.resource] ?? 0;
      number(intent.amount, 'encounter resource change', 0, cap - before);
      const after = before + intent.amount;
      state.deckState[deck.id].resources[intent.resource] = after;
      appendEvent(state, events, 'resourceChanged', 'encounterStart', intent.sourceId, [], { resource: intent.resource, before, after, delta: intent.amount });
    }
  }
}

function rewardStep(state, catalog, action, events) {
  ensure(state.phase === 'reward', 'No reward is available now');
  ensure(action && action.type === 'chooseResidue', 'Choose a residue');
  if (action.residueId === null) {
    appendEvent(state, events, 'residueKept', 'reward', 'core.residues', [], {});
  } else {
    const choices = availableResidues(state, catalog);
    ensure(choices.some((residue) => residue.id === action.residueId), 'Residue was not earned in this encounter');
    const definition = catalog.residues[action.residueId];
    const current = state.residues.find((entry) => entry.id === action.residueId);
    ensure(!current, 'Installed residues level through their objectives, not reward picks');
    if (state.residues.length >= getPot(state).residueSlots) {
      ensure(action.replaceResidueId && state.residues.some((entry) => entry.id === action.replaceResidueId), 'Choose which residue to replace');
      state.residues = state.residues.filter((entry) => entry.id !== action.replaceResidueId);
    } else ensure(!action.replaceResidueId, 'No replacement is needed');
    state.residues.push({ id: definition.id, tier: 1, progress: 0 });
    appendEvent(state, events, 'residueInstalled', 'reward', definition.id, [], { replaced: action.replaceResidueId ?? null, tier: 1 });
  }
  state.encounterIndex++;
  state.round = 0;
  state.score = 0;
  state.encounterTypes = [];
  state.encounterPulseSources = [];
  state.encounterMaxConcurrentSources = 0;
  state.rewardOffers = null;
  state.phase = 'chapter';
  state.offers = [];
  state.disabledResidueIds = [];
  state.bossTurn = { forcedHeat: null, giftCardId: null };
  state.contributedIds = [];
  state.lastBreakdown = null;
  for (const deckState of Object.values(state.deckState)) deckState.flags = {};
  appendEvent(state, events, 'chapterRevealed', 'encounter', getEncounter(state).id, [], { encounterIndex: state.encounterIndex });
}

function eligibleResidues(state, catalog) {
  const contributedDecks = new Set(state.contributedIds.filter((id) => !catalog.cards[id]?.system).map((id) => catalog.cards[id]?.deckId));
  return Object.values(catalog.residues).filter((entry) => contributedDecks.has(entry.deckId) && !state.residues.some((installed) => installed.id === entry.id)).sort((a, b) => a.id.localeCompare(b.id));
}
export function availableResidues(state, catalog) {
  const eligible = eligibleResidues(state, catalog);
  return state.phase === 'reward' && Array.isArray(state.rewardOffers) ? eligible.filter((entry) => state.rewardOffers.includes(entry.id)) : eligible;
}

export function createGame(catalog, { deckIds = ['pantry', 'culture'], potId = 'iron', storyId = 'royal', seed = 1 } = {}) {
  ensure(catalog?.version === '0.2.0', 'Unsupported content catalog');
  const requested = [...new Set(deckIds)];
  ensure(requested.includes('pantry'), 'Every run includes the common Pantry');
  ensure(requested.length >= 2 && requested.length <= 3, 'Choose one or two themed decks');
  ensure(requested.every((id) => catalog.decks[id]), 'Unknown deck');
  ensure(POTS.some((pot) => pot.id === potId), 'Unknown pot');
  ensure(STORIES.some((story) => story.id === storyId), 'Unknown story');
  number(seed, 'seed', 0, 0xffffffff);
  ensure(Number.isInteger(seed), 'Seed must be an integer');
  const state = {
    rulesVersion: RULES_VERSION, catalogVersion: catalog.version, deckIds: ['pantry', ...requested.filter((id) => id !== 'pantry').sort()], potId, storyId,
    seed, rng: (seed >>> 0) || 0x6d2b79f5, nextEvent: 0, nextInstance: 0,
    phase: 'stock', encounterIndex: 0, round: 0, score: 0, totalScore: 0, temperature: 80, servingSize: 'standard',
    contents: [], offers: [], stockOffers: [], residues: [], rewardOffers: null, disabledResidueIds: [], bossTurn: { forcedHeat: null, giftCardId: null }, contributedIds: [], encounterTypes: [], encounterPulseSources: [], encounterMaxConcurrentSources: 0, chapterResults: [], lastEncounterStars: 0, lastBreakdown: null, commandLog: [],
    deckState: Object.fromEntries(Object.keys(catalog.decks).map((id) => [id, { resources: {}, flags: {} }]))
  };
  const events = [];
  appendEvent(state, events, 'runStarted', 'setup', 'core.run', [], { seed, potId, storyId, deckIds: state.deckIds });
  const pool = STOCKS.filter((stock) => storyId !== 'road' || ['pantry.stock-herb', 'pantry.stock-mushroom', 'pantry.stock-orchard', 'pantry.stock-root'].includes(stock.id));
  while (state.stockOffers.length < 3) state.stockOffers.push(pool.splice(Math.floor(random(state) * pool.length), 1)[0].id);
  appendEvent(state, events, 'stocksOffered', 'setup', 'core.stock', [], { stockOffers: [...state.stockOffers] });
  return { state, events, errors: [] };
}

export function step(catalog, state, action) {
  const events = [];
  try {
    ensure(state.rulesVersion === RULES_VERSION && state.catalogVersion === catalog.version, 'Run version does not match this engine/catalog');
    const next = copy(state);
    if (action?.type === 'serve') servingStep(next, catalog, action, events);
    else if (action?.type === 'chooseResidue') rewardStep(next, catalog, action, events);
    else if (action?.type === 'chooseStock') chooseStock(next, catalog, action, events);
    else if (action?.type === 'startChapter') startChapter(next, catalog, events);
    else fail(`Unknown command ${action?.type ?? ''}`);
    next.commandLog.push(copy(action));
    next.lastEvents = events;
    return { state: next, events, explanation: next.lastBreakdown, errors: [] };
  } catch (error) {
    return { state, events: [], errors: [error.message] };
  }
}

export function preview(catalog, state, action) {
  return step(catalog, state, action);
}

export function replayGame(catalog, { deckIds, potId, storyId, seed, commands }) {
  const started = createGame(catalog, { deckIds, potId, storyId, seed });
  let state = started.state;
  const events = [...started.events];
  for (const command of commands) {
    const result = step(catalog, state, command);
    if (result.errors.length) return { state, events, errors: result.errors };
    state = result.state;
    events.push(...result.events);
  }
  return { state, events, errors: [] };
}
