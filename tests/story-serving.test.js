import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadCatalog } from '../decks/catalog.js';
import { createGame, step, preview, replayGame, STOCKS, SERVING_SIZES, POTS, getEncounter, activeDeckIds, inspectReactions, occupiedVolume } from '../packages/game-core/index.js';
import { STORIES, audienceReaction } from '../stories/catalog.js';
import { residueTier } from '../packages/deck-contract/helpers.js';
import { advanceResidues } from '../packages/game-core/residue-objectives.js';
import { beginRun } from './run-helpers.js';
const catalog = await loadCatalog(async (url) => JSON.parse(await readFile(url, 'utf8')));
test('catalog rejects unknown objective counters, invalid goals and unsupported residue levels', async () => {
  for (const mutation of [
    (residue) => { residue.objective.metric = 'misspelled-counter'; },
    (residue) => { residue.objective.target = Infinity; },
    (residue) => { residue.maxTier = 3; }
  ]) {
    await assert.rejects(loadCatalog(async (url) => {
      const definition = JSON.parse(await readFile(url, 'utf8'));
      if (definition.id === 'pantry') mutation(definition.residues[0]);
      return definition;
    }), /Invalid deck package/);
  }
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function board(entries, options = {}) {
  const state = beginRun(catalog, { deckIds: ['pantry', 'culture', 'chorus'], ...options }).state;
  state.contents = entries.map(([cardId, presence = 1], index) => ({ cardId, presence, instanceId: `i${index + 1}`, addedAt: index + 1 }));
  state.nextInstance = entries.length;
  return state;
}
function perform(state, extras = {}) {
  const result = step(catalog, state, { type: 'serve', offerId: state.offers[0], disposition: 'discard', temperature: state.bossTurn.forcedHeat ?? 80, servingSize: getEncounter(state).boss?.requiredSize ?? 'standard', ...extras });
  assert.deepEqual(result.errors, []);
  return result;
}
const pulse = (result, id) => result.events.find((event) => event.type === 'reactionPulse' && event.sourceId === id);
function enterChapter(state, index) {
  state.encounterIndex = index;
  state.phase = 'chapter';
  state.round = 0;
  const result = step(catalog, state, { type: 'startChapter' });
  assert.deepEqual(result.errors, []);
  return result.state;
}

test('starting stock is a seeded choice of three distinct weak stocks, with a gated chapter introduction', () => {
  const first = createGame(catalog, { seed: 19 });
  assert.equal(first.state.phase, 'stock');
  assert.deepEqual(first.state.contents, []);
  assert.equal(new Set(first.state.stockOffers).size, 3);
  assert.deepEqual(first, createGame(catalog, { seed: 19 }));
  const otherPot = createGame(catalog, { seed: 19, potId: 'royal' });
  assert.deepEqual(first.state.stockOffers, otherPot.state.stockOffers);
  assert.equal(step(catalog, first.state, { type: 'startChapter' }).errors.length, 1);
  const unavailable = STOCKS.find((entry) => !first.state.stockOffers.includes(entry.id));
  const invalid = step(catalog, first.state, { type: 'chooseStock', stockId: unavailable.id });
  assert.equal(invalid.errors.length, 1);
  assert.deepEqual(invalid.state, first.state);
  const chosen = step(catalog, first.state, { type: 'chooseStock', stockId: first.state.stockOffers[0] });
  assert.equal(chosen.state.phase, 'chapter');
  near(occupiedVolume(chosen.state.contents[0], catalog), .6);
  assert.equal(chosen.state.round, 0);
  assert.equal(step(catalog, chosen.state, { type: 'chooseStock', stockId: first.state.stockOffers[1] }).errors.length, 1);
  assert.equal(step(catalog, chosen.state, { type: 'serve' }).errors.length, 1);
  for (const stock of STOCKS) {
    assert.ok(stock.basePower < catalog.cards['pantry.broth'].basePower);
    assert.ok(Object.values(stock.properties).every((value) => value < .25));
  }
});

test('serving size multiplies every score contribution and changes ordinary decay in both pots', () => {
  for (const pot of POTS) {
    const state = board([['pantry.beef'], ['pantry.onion'], ['chorus.glass-noodle']], { potId: pot.id });
    const standard = perform(state);
    for (const size of SERVING_SIZES) {
      const result = perform(state, { servingSize: size.id });
      near(result.explanation.total, standard.explanation.total * size.multiplier);
      near(result.state.contents[0].presence, 1 - size.volume / pot.capacity);
      const sum = result.explanation.details.flatMap((detail) => detail.contributions.map((part) => part.amount * detail.customer * detail.residueMultiplier * detail.servingMultiplier * detail.demandMultiplier)).reduce((a, b) => a + b, 0);
      near(sum, result.explanation.total);
    }
    const invalid = step(catalog, state, { type: 'serve', offerId: state.offers[0], disposition: 'discard', temperature: 80, servingSize: 'giant' });
    assert.equal(invalid.errors.length, 1);
    assert.deepEqual(invalid.state, state);
  }
});

test('retention abilities and Extraction losses scale with portion size too', () => {
  const state = board([['culture.mother'], ['culture.cream'], ['culture.peel']]);
  for (const size of SERVING_SIZES) {
    const result = perform(state, { temperature: 50, servingSize: size.id });
    near(result.state.contents[0].presence, 1 - .04 * size.volume / .4);
  }
  const acidic = board([['pantry.lemon'], ['pantry.salt']]);
  for (const size of SERVING_SIZES) {
    const result = perform(acidic, { temperature: 80, servingSize: size.id });
    near(result.state.contents[0].presence, (1 - size.volume / 3) * (1 - .04 * size.volume / .4));
  }
});

test('stocks shrink into broth; broth earns modest volume-dependent points', () => {
  const stock = board([[STOCKS[0].id, .16]]);
  const result = perform(stock);
  const broth = result.state.contents.find((entry) => entry.cardId === 'pantry.broth');
  assert.ok(broth);
  near(broth.volume, .6 * .16 * (1 - .4 / 3));
  const next = perform(result.state);
  assert.ok(next.explanation.total > 0);
  assert.ok(next.explanation.total < 10);
  const more = structuredClone(result.state);
  more.contents[0].volume *= 2;
  assert.ok(perform(more).explanation.total > next.explanation.total);
});

test('both authored stories have 3/3/4 arcs, boss finales, geometric pressure and normal-only preferences', () => {
  assert.equal(STORIES.length, 2);
  for (const story of STORIES) {
    assert.equal(story.chapters.length, 10);
    assert.deepEqual(story.chapters.map((entry) => entry.arc), [0, 0, 0, 1, 1, 1, 2, 2, 2, 2]);
    assert.deepEqual(story.chapters.flatMap((entry, index) => entry.boss ? [index] : []), [2, 5, 9]);
    story.chapters.forEach((entry, index) => {
      assert.ok(entry.narrative.length > 120);
      assert.equal(entry.dialogue.length, 3);
      assert.equal(entry.target, Math.round(400 * 1.28 ** index * (entry.boss ? 1.2 : 1)));
      assert.equal(entry.modifier.bonus, 1.2);
      assert.equal(entry.modifier.penalty, .8);
      assert.ok(Object.values(catalog.cards).some((card) => card.type === entry.modifier.bonusType));
    });
    const chapter = story.chapters[2];
    assert.equal(audienceReaction(chapter, 0, chapter.target).level, 0);
    assert.equal(audienceReaction(chapter, chapter.target / 2, chapter.target).level, 1);
    assert.equal(audienceReaction(chapter, chapter.target, chapter.target).level, 2);
  }
});

test('princess requests replace one offer with an off-deck card, enforce small bowls and reward adding it', () => {
  const state = enterChapter(board([['pantry.beef'], ['pantry.onion']], { deckIds: ['pantry', 'culture'] }), 2);
  const gift = state.bossTurn.giftCardId;
  assert.equal(state.offers.length, 3);
  assert.equal(state.offers[state.bossTurn.giftSlot], gift);
  assert.ok(!state.deckIds.includes(catalog.cards[gift].deckId));
  const action = { type: 'serve', disposition: 'add', offerId: gift, temperature: 80, servingSize: 'small' };
  const before = structuredClone(state);
  assert.deepEqual(preview(catalog, state, action), step(catalog, state, action));
  assert.deepEqual(state, before);
  const added = step(catalog, state, action);
  assert.deepEqual(added.errors, []);
  assert.equal(added.explanation.demandMultiplier, 1.35);
  assert.ok(activeDeckIds(added.state, catalog).includes(catalog.cards[gift].deckId));
  const passed = perform(state, { offerId: gift, servingSize: 'small' });
  assert.equal(passed.explanation.demandMultiplier, 1);
  const wrong = step(catalog, state, { ...action, servingSize: 'large' });
  assert.match(wrong.errors[0], /only accepts small/);
  assert.deepEqual(wrong.state, state);
});

test('ogre only accepts large bowls; dragon locks announced heat only on designated rounds', () => {
  const ogre = enterChapter(board([['pantry.beef']], { storyId: 'road' }), 2);
  assert.equal(step(catalog, ogre, { type: 'serve', offerId: ogre.offers[0], disposition: 'discard', temperature: 80, servingSize: 'standard' }).errors.length, 1);
  assert.deepEqual(perform(ogre, { servingSize: 'large' }).errors, []);
  const dragon = enterChapter(board([['pantry.beef']]), 5);
  assert.equal(dragon.bossTurn.forcedHeat, null);
  const next = perform(dragon).state;
  assert.ok(getEncounter(next).boss.heatChoices.includes(next.bossTurn.forcedHeat));
  const locked = next.bossTurn.forcedHeat;
  const wrong = step(catalog, next, { type: 'serve', offerId: next.offers[0], disposition: 'discard', temperature: locked === 80 ? 90 : 80, servingSize: 'standard' });
  assert.match(wrong.errors[0], /locked/);
  assert.deepEqual(wrong.state, next);
  assert.equal(perform(next).state.bossTurn.forcedHeat, null);
});

test('witch suppression is temporary, affects rules and objective progress, and never removes a residue', () => {
  let state = board([['pantry.beef'], ['pantry.onion']], { storyId: 'road' });
  state.residues = [{ id: 'pantry.hearth-coating', tier: 1, progress: 2 }];
  state = enterChapter(state, 5);
  assert.deepEqual(state.disabledResidueIds, ['pantry.hearth-coating']);
  assert.equal(residueTier(state, 'pantry.hearth-coating'), 0);
  assert.equal(inspectReactions(state, catalog).find((entry) => entry.id === 'core.browning').multiplier, 1);
  state.score = getEncounter(state).target;
  for (let i = 0; i < 5; i++) state = perform(state).state;
  assert.deepEqual(state.residues, [{ id: 'pantry.hearth-coating', tier: 1, progress: 2 }]);
  const next = step(catalog, state, { type: 'chooseResidue', residueId: null });
  assert.deepEqual(next.errors, []);
  assert.deepEqual(next.state.disabledResidueIds, []);
  assert.equal(residueTier(next.state, 'pantry.hearth-coating'), 1);
});

test('residue objectives upgrade after scoring, survive chapters and reset with a new run', () => {
  const state = board([['pantry.beef'], ['pantry.onion']]);
  state.residues = [{ id: 'pantry.hearth-coating', tier: 1, progress: 2 }];
  const result = perform(state);
  assert.equal(result.state.residues[0].tier, 2);
  assert.equal(result.state.residues[0].progress, 3);
  assert.equal(pulse(result, 'core.browning').data.modifiers[0].factor, 1.5);
  assert.ok(result.events.findIndex((event) => event.type === 'residueLeveled') > result.events.findIndex((event) => event.type === 'scoreCalculated'));
  assert.equal(pulse(perform(result.state), 'core.browning').data.modifiers[0].factor, 2);
  const finished = { ...result.state, phase: 'reward' };
  const next = step(catalog, finished, { type: 'chooseResidue', residueId: null });
  assert.deepEqual(next.state.residues, result.state.residues);
  assert.deepEqual(createGame(catalog).state.residues, []);
});

test('all sixteen residue objectives have finite counters and cap at level two', () => {
  assert.equal(Object.keys(catalog.residues).length, 16);
  const state = board([]);
  state.residues = Object.values(catalog.residues).map((definition) => ({ id: definition.id, tier: 1, progress: 0 }));
  const metrics = Object.fromEntries(Object.values(catalog.residues).map((definition) => [definition.objective.metric, 100]));
  const emitted = [];
  advanceResidues(state, catalog, metrics, (...event) => emitted.push(event));
  assert.ok(state.residues.every((entry) => entry.tier === 2));
  assert.equal(emitted.filter(([type]) => type === 'residueLeveled').length, 16);
  const before = structuredClone(state);
  advanceResidues(state, catalog, metrics, () => assert.fail('Max-level residue changed'));
  assert.deepEqual(state, before);
});

test('portion residues change only their matching size and Grand Table needs three ingredient types', () => {
  const state = board([['pantry.beef'], ['pantry.onion'], ['pantry.salt']]);
  state.residues = [{ id: 'pantry.tasting-spoon', tier: 1 }, { id: 'pantry.grand-table', tier: 1 }];
  near(perform(state, { servingSize: 'small' }).explanation.servingMultiplier, .8);
  near(perform(state, { servingSize: 'standard' }).explanation.servingMultiplier, 1);
  near(perform(state, { servingSize: 'large' }).explanation.servingMultiplier, 1.7);
  state.contents.pop();
  near(perform(state, { servingSize: 'large' }).explanation.servingMultiplier, 1.5);
});

test('new Culture and Hearth residues provide conditional amplification and resource recycling', () => {
  const culture = board([['culture.plum'], ['pantry.lemon']]);
  culture.deckState.culture.resources.culture = 3;
  culture.residues = [{ id: 'culture.living-lid', tier: 1 }, { id: 'culture.last-drop', tier: 1 }];
  assert.equal(inspectReactions({ ...culture, temperature: 50 }, catalog).find((entry) => entry.id === 'core.preservation').multiplier, 1.5);
  near(pulse(perform(culture, { temperature: 95 }), 'culture.harvest').data.total, 30 * 3 * 3 * 1.4);
  const hearth = board([['hearth.smokeleaf'], ['hearth.marrow'], ['hearth.bean']], { deckIds: ['pantry', 'hearth'] });
  hearth.deckState.hearth.resources.char = 3;
  hearth.residues = [{ id: 'hearth.red-glaze', tier: 1 }, { id: 'hearth.ash-memory', tier: 1 }];
  near(inspectReactions(hearth, catalog).find((entry) => entry.id === 'core.browning').multiplier, 1.6 * 1.5);
  assert.equal(perform(hearth, { temperature: 110 }).state.deckState.hearth.resources.char, 1);
});

test('Counterpoint amplifies directional copies and Encore copies the last common reaction only', () => {
  const state = board([['chorus.cream'], ['chorus.mushroom'], ['pantry.beef'], ['pantry.onion'], ['chorus.glass-noodle'], ['chorus.citrus'], ['chorus.gel']]);
  state.residues = [{ id: 'chorus.counterpoint', tier: 1 }, { id: 'chorus.encore', tier: 1 }];
  const result = perform(state);
  near(pulse(result, 'chorus.harmony').data.total, pulse(result, 'core.browning').data.total * 1.5);
  const last = result.events.findLast((event) => event.type === 'reactionPulse' && event.sourceId.startsWith('core.')), encore = pulse(result, 'chorus.encore');
  near(encore.data.total, last.data.total * .35);
  assert.deepEqual(encore.parentIds, [last.id]);
  assert.equal(encore.data.echoable, false);
});

test('story selection and setup commands replay deterministically without altering stock or offers', () => {
  const options = { deckIds: ['pantry', 'hearth'], potId: 'royal', storyId: 'road', seed: 292 };
  let state = beginRun(catalog, options).state;
  for (const servingSize of ['small', 'large', 'standard']) state = perform(state, { disposition: 'add', servingSize }).state;
  const replayed = replayGame(catalog, { ...options, commands: state.commandLog });
  assert.deepEqual(replayed.errors, []);
  assert.deepEqual(replayed.state, state);
});
