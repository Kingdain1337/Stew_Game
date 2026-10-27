import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadCatalog } from '../decks/catalog.js';
import { BROTH_CARD_ID, BROTH_CUTOFF, ENCOUNTERS, POTS, SERVING_VOLUME, inspectReactions, availableResidues, createGame, encounterTarget, occupiedVolume, preview, replayGame, step } from '../packages/game-core/index.js';
import { effectiveProperty } from '../packages/deck-contract/helpers.js';
import { beginRun } from './run-helpers.js';

const catalog = await loadCatalog(async (url) => JSON.parse(await readFile(url, 'utf8')));

function fixture(deckIds = ['pantry', 'culture'], entries = [], seed = 7) {
  const state = beginRun(catalog, { deckIds, seed }).state;
  state.contents = entries.map(([cardId, presence], index) => ({ instanceId: `i${index + 1}`, cardId, presence, addedAt: index + 1 }));
  state.nextInstance = entries.length;
  return state;
}

function serve(state, temperature, extras = {}) {
  const action = { type: 'serve', offerId: state.offers[0], disposition: 'discard', temperature, ...extras };
  const result = step(catalog, state, action);
  assert.deepEqual(result.errors, []);
  return result;
}

function pulses(result, sourceId) {
  return result.events.filter((event) => event.type === 'reactionPulse' && event.sourceId === sourceId);
}

test('catalog loads 30 draftable ingredients plus one undraftable broth', () => {
  assert.equal(Object.values(catalog.cards).filter((card) => !card.system).length, 30);
  assert.equal(catalog.cards[BROTH_CARD_ID].system, true);
  for (const id of ['culture', 'hearth', 'chorus']) {
    const first = beginRun(catalog, { deckIds: ['pantry', id], seed: 42 });
    const again = beginRun(catalog, { deckIds: ['pantry', id], seed: 42 });
    assert.deepEqual(first, again);
    assert.ok(!first.state.offers.includes(BROTH_CARD_ID));
    assert.ok(first.state.offers.some((offer) => catalog.decks[id].openingIds.includes(offer)));
  }
});

test('preview is authoritative for a proposed serve and leaves the run unchanged', () => {
  const state = fixture();
  const before = structuredClone(state);
  const action = { type: 'serve', offerId: state.offers[0], disposition: 'add', temperature: 50 };
  const projected = preview(catalog, state, action);
  const committed = step(catalog, state, action);
  assert.deepEqual(state, before);
  assert.deepEqual(projected, committed);
  assert.ok(committed.state.nextEvent > state.nextEvent);
});

test('accepted commands can replay the same run state and event stream', () => {
  const options = { deckIds: ['pantry', 'culture'], potId: 'iron', seed: 931 };
  const started = beginRun(catalog, options);
  const first = step(catalog, started.state, { type: 'serve', offerId: started.state.offers[0], disposition: 'add', temperature: 50 });
  const second = step(catalog, first.state, { type: 'serve', offerId: first.state.offers[0], disposition: 'discard', temperature: 95 });
  assert.deepEqual(second.errors, []);
  const replayed = replayGame(catalog, { ...options, commands: second.state.commandLog });
  assert.deepEqual(replayed.errors, []);
  assert.deepEqual(replayed.state, second.state);
  assert.deepEqual(replayed.events, [...started.events, ...first.events, ...second.events]);
  assert.equal(started.state.commandLog.length, 2);
  assert.equal(first.state.commandLog.length, 3);
});

test('every scored point has an ordered visual event and reaction participants', () => {
  const state = fixture(['pantry', 'chorus'], [['pantry.beef', 1], ['pantry.onion', 1], ['chorus.glass-noodle', 1]]);
  const result = serve(state, 80);
  const scored = result.events.filter((event) => event.type === 'baseScored' || event.type === 'reactionPulse');
  assert.equal(scored.filter((event) => event.type === 'baseScored').length, result.explanation.details.length);
  assert.ok(scored.findIndex((event) => event.type === 'reactionPulse') > scored.findLastIndex((event) => event.type === 'baseScored'));
  const contributions = result.explanation.details.flatMap((detail) => detail.contributions.map((part) => part.amount * detail.customer * detail.residueMultiplier));
  assert.ok(Math.abs(contributions.reduce((sum, value) => sum + value, 0) - result.explanation.total) < 1e-8);
  for (const pulse of scored.filter((event) => event.type === 'reactionPulse')) {
    assert.ok(pulse.data.participantIds.length > 0);
    assert.ok(pulse.targetIds.every((id) => result.explanation.details.some((detail) => detail.instanceId === id)));
    if (pulse.data.origin === 'derived') assert.ok(pulse.parentIds.some((id) => scored.some((event) => event.id === id && event.data.origin === 'original')));
  }
});

test('Culture grows while cool, harvests at heat, and its residue restores only after spending at least four', () => {
  const cool = fixture(['pantry', 'culture'], [['culture.mother', 1], ['culture.plum', 1]]);
  cool.deckState.culture.resources.culture = 2;
  const growth = serve(cool, 50);
  assert.equal(growth.state.deckState.culture.resources.culture, 3);
  assert.equal(pulses(growth, 'culture.harvest').length, 0);

  const hot = fixture(['pantry', 'culture'], [['culture.plum', 1]]);
  hot.deckState.culture.resources.culture = 4;
  hot.residues = [{ id: 'culture.seasoned-crock', tier: 1 }];
  const harvest = serve(hot, 95);
  assert.equal(pulses(harvest, 'culture.harvest').length, 1);
  assert.equal(pulses(harvest, 'culture.harvest')[0].data.total, 240);
  assert.equal(harvest.state.deckState.culture.resources.culture, 1);
  const second = serve(harvest.state, 95);
  assert.equal(second.state.deckState.culture.resources.culture, 0);
  assert.equal(pulses(second, 'culture.harvest').length, 1);
});

test('ordinary reaction deltas compound in the published order', () => {
  const state = fixture(['pantry', 'chorus'], [['pantry.beef', 1], ['pantry.onion', 1], ['pantry.butter', 1]]);
  const result = serve(state, 80);
  const onion = result.explanation.details.find((detail) => detail.cardId === 'pantry.onion');
  const browning = onion.contributions.find((part) => part.sourceId === 'core.browning');
  const infusion = onion.contributions.find((part) => part.sourceId === 'core.infusion');
  assert.ok(browning && infusion);
  assert.ok(Math.abs(browning.amount - onion.base * 0.25) < 1e-8);
  assert.ok(Math.abs(infusion.amount - (onion.base + browning.amount) * 0.4) < 1e-8);
});

test('Hearth burns an older Protein source before scoring, then depletes it', () => {
  const state = fixture(['pantry', 'hearth'], [['hearth.marrow', 0.8], ['hearth.smokeleaf', 1], ['hearth.dumpling', 1]]);
  state.deckState.hearth.resources.char = 1;
  const result = serve(state, 95);
  assert.equal(result.state.deckState.hearth.resources.char, 2);
  assert.ok(Math.abs(result.state.contents[0].presence - 0.52) < 1e-8);
  assert.equal(pulses(result, 'hearth.char-payoff')[0].data.total, 50);
  assert.equal(result.events.filter((event) => event.type === 'presenceConsumed').length, 1);
});

test('Hearth cool conversion spends Char and retains the selected older ingredient', () => {
  const state = fixture(['pantry', 'hearth'], [['hearth.marrow', 0.6], ['hearth.dumpling', 1], ['hearth.cinder-bean', 1]]);
  state.deckState.hearth.resources.char = 2;
  const result = serve(state, 50);
  assert.equal(result.state.deckState.hearth.resources.char, 1);
  assert.ok(Math.abs(result.state.contents[0].presence - 0.576) < 1e-8);
  assert.equal(pulses(result, 'hearth.char-payoff')[0].data.total, 25);
});

test('Chorus copies only the first positive original pulse and pays presence once', () => {
  const state = fixture(['pantry', 'chorus'], [['pantry.beef', 1], ['pantry.onion', 1], ['chorus.glass-noodle', 1]]);
  const result = serve(state, 80);
  const originals = result.events.filter((event) => event.type === 'reactionPulse' && event.data.origin === 'original');
  const echoes = result.events.filter((event) => event.type === 'reactionPulse' && event.data.origin === 'derived');
  assert.ok(originals.length >= 1);
  assert.equal(echoes.length, 1);
  assert.ok(Math.abs(echoes[0].data.total - originals[0].data.total * 1.25) < 1e-8);
  assert.deepEqual(echoes[0].parentIds, [originals[0].id]);
  assert.equal(echoes[0].data.echoable, false);
  assert.ok(Math.abs(result.state.contents[2].presence - 0.78) < 1e-8);
});

test('Culture harvest crosses the shared pulse boundary into Chorus exactly once', () => {
  const state = fixture(['pantry', 'culture', 'chorus'], [['culture.plum', 1], ['chorus.glass-noodle', 1]]);
  state.deckState.culture.resources.culture = 3;
  const result = serve(state, 95);
  const harvest = pulses(result, 'culture.harvest');
  const echoes = result.events.filter((event) => event.type === 'reactionPulse' && event.data.origin === 'derived');
  assert.equal(harvest.length, 1);
  assert.equal(harvest[0].data.total, 180);
  assert.equal(echoes.length, 1);
  assert.equal(echoes[0].data.total, 225);
  assert.deepEqual(echoes[0].parentIds, [harvest[0].id]);
  assert.equal(result.state.deckState.culture.resources.culture, 0);
});

test('pot volume is the only active ingredient limit; a replacement can free capacity', () => {
  const state = fixture(['pantry', 'culture'], [['pantry.beef', 1], ['pantry.beef', 1], ['pantry.beef', 1], ['pantry.onion', 1]]);
  state.offers = ['pantry.beef', 'pantry.salt', 'pantry.butter'];
  const before = structuredClone(state);
  const invalid = step(catalog, state, { type: 'serve', offerId: state.offers[0], disposition: 'add', temperature: 80 });
  assert.match(invalid.errors[0], /not enough pot volume/i);
  assert.deepEqual(invalid.state, before);
  const valid = step(catalog, state, { type: 'serve', offerId: state.offers[0], disposition: 'add', temperature: 80, replaceInstanceId: 'i1' });
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.state.contents.length, 4);
  assert.ok(valid.events.some((event) => event.type === 'ingredientRemoved'));

  const spacious = fixture(['pantry', 'culture'], Array.from({ length: 6 }, () => ['pantry.salt', 1]));
  const added = step(catalog, spacious, { type: 'serve', offerId: spacious.offers[0], disposition: 'add', temperature: 80 });
  assert.deepEqual(added.errors, []);
  assert.equal(added.state.contents.length, 7);
});

test('serving frees volume, and below 0.15 presence ingredients become one fixed-property broth', () => {
  const state = fixture(['pantry', 'culture'], [['pantry.onion', 0.17], ['pantry.butter', 0.17]]);
  const beforeVolume = state.contents.reduce((sum, entry) => sum + occupiedVolume(entry, catalog), 0);
  const result = serve(state, 80);
  assert.equal(BROTH_CUTOFF, 0.15);
  assert.equal(result.state.contents.length, 1);
  const broth = result.state.contents[0];
  assert.equal(broth.cardId, BROTH_CARD_ID);
  assert.ok(Math.abs(broth.volume - beforeVolume * (13 / 15)) < 1e-8);
  assert.ok(result.events.filter((event) => event.type === 'ingredientDissolved').length === 2);
  assert.ok(result.events.some((event) => event.type === 'brothEnriched'));
  for (const property of ['sugar', 'acid', 'aromatic', 'protein', 'mineral']) {
    assert.equal(effectiveProperty(result.state, catalog, property), 0.25);
  }
  assert.equal(effectiveProperty(result.state, catalog, 'fat'), 0);
  const next = serve(result.state, 80);
  assert.ok(next.state.contents[0].volume < broth.volume);
  assert.equal(effectiveProperty(next.state, catalog, 'acid'), 0.25);
  const enriched = structuredClone(next.state);
  enriched.contents.push({ instanceId: 'i3', cardId: 'pantry.onion', presence: 0.17, addedAt: 3 });
  enriched.nextInstance = 3;
  const onceMore = serve(enriched, 80);
  assert.equal(onceMore.state.contents.filter((entry) => entry.cardId === BROTH_CARD_ID).length, 1);
  assert.equal(effectiveProperty(onceMore.state, catalog, 'acid'), 0.25);
  assert.ok(onceMore.state.contents[0].volume > next.state.contents[0].volume * (13 / 15));
});

test('ordinary ingredients lose occupied volume even when they stay above the broth cutoff', () => {
  const state = fixture(['pantry', 'culture'], [['pantry.beef', 1]]);
  const before = occupiedVolume(state.contents[0], catalog);
  const result = serve(state, 80);
  const after = occupiedVolume(result.state.contents[0], catalog);
  assert.ok(Math.abs(after - before * (13 / 15)) < 1e-8);
  assert.equal(result.state.contents[0].cardId, 'pantry.beef');
  assert.ok(!result.state.contents.some((entry) => entry.cardId === BROTH_CARD_ID));
  assert.deepEqual(createGame(catalog, { deckIds: ['pantry', 'culture'] }).state.contents, []);
  const atCutoff = fixture(['pantry', 'culture'], [['pantry.beef', (0.15 + 1e-12) / (13 / 15)]]);
  const boundary = serve(atCutoff, 80);
  assert.ok(boundary.state.contents[0].presence >= BROTH_CUTOFF);
  assert.equal(boundary.state.contents[0].cardId, 'pantry.beef');
});

test('story targets are independent of pot choice at every chapter', () => {
  const iron = fixture(), royal = { ...structuredClone(iron), potId: 'royal' };
  for (let chapter = 0; chapter < ENCOUNTERS.length; chapter++) {
    iron.encounterIndex = royal.encounterIndex = chapter;
    assert.equal(encounterTarget(iron), encounterTarget(royal));
  }
  assert.equal(ENCOUNTERS[0].target, 400);
});

test('broth properties participate in reactions but cannot fuel a Hearth furnace', () => {
  const state = fixture(['pantry', 'hearth'], [['hearth.smokeleaf', 1]]);
  state.contents.push({ instanceId: 'broth', cardId: BROTH_CARD_ID, presence: 1, addedAt: 0, volume: 0.1 });
  const result = serve(state, 95);
  assert.equal(result.state.deckState.hearth.resources.char ?? 0, 0);
  assert.ok(result.events.some((event) => event.type === 'brothServed'));
  assert.equal(effectiveProperty(state, catalog, 'protein'), 0.25);
  assert.equal(effectiveProperty(result.state, catalog, 'protein'), 0.25);
  const reactive = fixture(['pantry', 'hearth'], [['pantry.beef', 1]]);
  reactive.contents.push({ instanceId: 'broth', cardId: BROTH_CARD_ID, presence: 1, addedAt: 0, volume: 0.1 });
  const browned = serve(reactive, 80);
  assert.ok(browned.events.some((event) => event.type === 'reactionPulse' && event.sourceId === 'core.browning'));
});

test('residue choices use the encounter contribution ledger and run resources survive the transition', () => {
  const state = fixture(['pantry', 'culture'], []);
  state.phase = 'reward';
  state.contributedIds = ['culture.mother', 'pantry.beef'];
  state.deckState.culture.resources.culture = 2;
  state.deckState.culture.flags.crockUsed = 1;
  assert.ok(availableResidues(state, catalog).some((residue) => residue.id === 'culture.seasoned-crock'));
  const first = step(catalog, state, { type: 'chooseResidue', residueId: 'culture.seasoned-crock' });
  assert.deepEqual(first.errors, []);
  assert.deepEqual(first.state.residues, [{ id: 'culture.seasoned-crock', tier: 1, progress: 0 }]);
  assert.equal(first.state.deckState.culture.resources.culture, 2);
  assert.deepEqual(first.state.deckState.culture.flags, {});
  assert.equal(first.state.phase, 'chapter');
  const newRun = createGame(catalog, { deckIds: ['pantry', 'culture'], seed: 7 });
  assert.deepEqual(newRun.state.residues, []);
  assert.deepEqual(newRun.state.deckState.culture.resources, {});
});

test('undeclared deck operations roll back the entire serving', () => {
  const state = fixture(['pantry', 'hearth'], [['hearth.smokeleaf', 1], ['hearth.marrow', 1]]);
  const before = structuredClone(state);
  const broken = { ...catalog, decks: { ...catalog.decks,
    hearth: { ...catalog.decks.hearth, rules: { ...catalog.decks.hearth.rules, handlers: { ...catalog.decks.hearth.rules.handlers,
      preServe: () => [{ kind: 'resource', sourceId: 'hearth.invalid', resource: 'imaginary', amount: 1 }] } } } } };
  const result = step(broken, state, { type: 'serve', offerId: state.offers[0], disposition: 'discard', temperature: 95 });
  assert.match(result.errors[0], /undeclared resource/);
  assert.deepEqual(result.state, before);
  assert.deepEqual(result.events, []);
});

test('pots trade concentration and seven residue slots against capacity and retention', () => {
  assert.equal(SERVING_VOLUME, .4);
  assert.deepEqual(POTS.map(({ capacity, residueSlots }) => [capacity, residueSlots]), [[3, 7], [5, 5]]);
  const iron = fixture(['pantry', 'culture'], [['pantry.beef', 1]]);
  const royal = { ...structuredClone(iron), potId: 'royal' };
  const small = serve(iron, 80), large = serve(royal, 80);
  assert.ok(Math.abs(small.explanation.total / large.explanation.total - 5 / 3) < 1e-8);
  assert.ok(Math.abs(large.state.contents[0].presence - .92) < 1e-8);
  assert.ok(small.state.contents[0].presence < large.state.contents[0].presence);
});

test('all ten encounters resolve through three arcs, with nine rewards', () => {
  assert.equal(ENCOUNTERS.length, 10);
  assert.deepEqual(ENCOUNTERS.map((entry) => entry.arc), [0, 0, 0, 1, 1, 1, 2, 2, 2, 2]);
  let state = fixture(), turns = 0, rewards = 0;
  for (let stage = 0; stage < ENCOUNTERS.length; stage++) {
    state.score = encounterTarget(state); // Isolate lifecycle from difficulty.
    for (let bowl = 0; bowl < ENCOUNTERS[stage].servings; bowl++) {
      state = serve(state, state.bossTurn.forcedHeat ?? 50, { servingSize: ENCOUNTERS[stage].boss?.requiredSize ?? 'standard' }).state;
      turns++;
    }
    if (stage < ENCOUNTERS.length - 1) {
      assert.equal(state.phase, 'reward');
      const reward = step(catalog, state, { type: 'chooseResidue', residueId: null });
      assert.deepEqual(reward.errors, []);
      assert.equal(reward.state.phase, 'chapter');
      const next = step(catalog, reward.state, { type: 'startChapter' });
      assert.deepEqual(next.errors, []);
      state = next.state;
      rewards++;
    }
  }
  assert.equal(state.phase, 'won');
  assert.equal(turns, 50);
  assert.equal(rewards, 9);
});

test('Iron fills seven slots and replaces only the explicitly selected residue', () => {
  const state = fixture();
  state.phase = 'reward';
  state.contributedIds = ['culture.mother', 'culture.plum', 'pantry.beef'];
  state.residues = Object.keys(catalog.residues).filter((id) => id !== 'culture.sugar-glaze').slice(0, 6).map((id) => ({ id, tier: 1, progress: 0 }));
  const seventh = availableResidues(state, catalog).find((entry) => entry.id !== 'culture.sugar-glaze').id;
  const installed = step(catalog, state, { type: 'chooseResidue', residueId: seventh });
  assert.deepEqual(installed.errors, []);
  assert.equal(installed.state.residues.length, 7);
  const full = { ...installed.state, phase: 'reward', contributedIds: state.contributedIds };
  const rejected = step(catalog, full, { type: 'chooseResidue', residueId: 'culture.sugar-glaze' });
  assert.match(rejected.errors[0], /which residue to replace/);
  assert.deepEqual(rejected.state, full);
  const victim = full.residues[3].id;
  const replaced = step(catalog, full, { type: 'chooseResidue', residueId: 'culture.sugar-glaze', replaceResidueId: victim });
  assert.deepEqual(replaced.errors, []);
  assert.equal(replaced.state.residues.length, 7);
  assert.ok(!replaced.state.residues.some((entry) => entry.id === victim));
  assert.deepEqual(replaced.state.residues.filter((entry) => entry.id !== 'culture.sugar-glaze'), full.residues.filter((entry) => entry.id !== victim));
  const duplicate = step(catalog, full, { type: 'chooseResidue', residueId: seventh });
  assert.equal(duplicate.errors.length, 1);
  assert.deepEqual(duplicate.state, full);
});

test('banked Char amplifies Browning; capped burns still pay Overflow without Dumplings', () => {
  const state = fixture(['pantry', 'hearth'], [['hearth.smokeleaf', 1], ['hearth.marrow', 1], ['hearth.pear', 1]]);
  state.deckState.hearth.resources.char = 6;
  state.residues = [{ id: 'hearth.banked-embers', tier: 2 }];
  const result = serve(state, 95);
  assert.equal(result.state.deckState.hearth.resources.char, 6);
  assert.equal(pulses(result, 'hearth.overflow')[0].data.total, 450);
  assert.deepEqual(pulses(result, 'hearth.overflow')[0].data.participantIds, ['i1', 'i2', 'i3']);
  assert.equal(pulses(result, 'hearth.char-payoff').length, 0);
  const consumed = result.events.find((event) => event.type === 'presenceConsumed');
  assert.ok(Math.abs(consumed.data.amount - .1) < 1e-8);
  const browning = pulses(result, 'core.browning')[0];
  assert.ok(browning.data.participantIds.includes('i1'), 'Browning lights its Char-boosting furnace');
  assert.ok(browning.data.modifiers.some((entry) => Math.abs(entry.factor - 2.2) < 1e-8));
  const unfueled = fixture(['pantry', 'hearth'], [['hearth.smokeleaf', 1], ['hearth.pear', 1]]);
  unfueled.deckState.hearth.resources.char = 6;
  assert.equal(pulses(serve(unfueled, 95), 'hearth.overflow').length, 0);
});

test('Blaze needs three Char, fires exactly at 110 degrees, and does not need a furnace or Dumplings', () => {
  const state = fixture(['pantry', 'hearth'], [['hearth.truffle', 1]]);
  state.deckState.hearth.resources.char = 6;
  state.residues = [{ id: 'hearth.coal-keeper', tier: 2 }];
  assert.equal(pulses(serve(state, 105), 'hearth.blaze').length, 0);
  const hot = serve(state, 110);
  assert.equal(pulses(hot, 'hearth.blaze')[0].data.total, 960);
  assert.equal(hot.state.deckState.hearth.resources.char, 0);
  state.deckState.hearth.resources.char = 2;
  assert.equal(pulses(serve(state, 110), 'hearth.blaze').length, 0);
  state.deckState.hearth.resources.char = 3;
  assert.equal(pulses(serve(state, 110), 'hearth.blaze')[0].data.total, 240);
  const burning = fixture(['pantry', 'hearth'], [['hearth.smokeleaf', 1], ['hearth.marrow', 1]]);
  burning.deckState.hearth.resources.char = 2;
  assert.equal(pulses(serve(burning, 110), 'hearth.blaze')[0].data.total, 180);
});

test('full-six Culture harvest earns the large Glaze multiplier and every valid growth is boosted', () => {
  const cool = fixture(['pantry', 'culture'], [['culture.mother', 1], ['culture.plum', 1], ['pantry.onion', 1]]);
  cool.residues = [{ id: 'culture.sugar-glaze', tier: 1 }];
  const first = serve(cool, 50);
  assert.equal(first.state.deckState.culture.resources.culture, 2);
  assert.equal(serve(first.state, 50).state.deckState.culture.resources.culture, 4);
  const hot = fixture(['pantry', 'culture'], [['culture.plum', 1]]);
  hot.residues = [{ id: 'culture.sugar-glaze', tier: 2 }, { id: 'culture.seasoned-crock', tier: 2 }];
  hot.deckState.culture.resources.culture = 6;
  const harvest = serve(hot, 95);
  assert.equal(pulses(harvest, 'culture.harvest')[0].data.total, 720);
  assert.equal(harvest.state.deckState.culture.resources.culture, 2);
  hot.deckState.culture.resources.culture = 5;
  assert.equal(pulses(serve(hot, 95), 'culture.harvest')[0].data.total, 300);
});

test('Harmony requires Infusion before Browning, obeys oldest conductor, and references both parents', () => {
  const entries = [['chorus.cream', 1], ['chorus.chime-fruit', 1], ['chorus.mushroom', 1], ['pantry.beef', 1], ['chorus.glass-noodle', 1]];
  const forward = serve(fixture(['pantry', 'chorus'], entries), 80);
  const originals = forward.events.filter((event) => event.type === 'reactionPulse' && event.data.origin === 'original');
  assert.equal(originals[0].sourceId, 'core.infusion');
  assert.equal(originals[0].data.orderSource, 'chorus.cream');
  const harmony = pulses(forward, 'chorus.harmony')[0];
  const browning = pulses(forward, 'core.browning')[0];
  assert.equal(harmony.data.total, browning.data.total);
  assert.deepEqual(harmony.parentIds, [originals[0].id, browning.id]);
  assert.equal(harmony.data.echoable, false);
  assert.ok(Math.abs(pulses(forward, 'chorus.glass-noodle')[0].data.total - originals[0].data.total * 1.25) < 1e-8);
  const reverse = serve(fixture(['pantry', 'chorus'], [entries[1], entries[0], ...entries.slice(2)]), 80);
  assert.equal(pulses(reverse, 'chorus.harmony').length, 0);
  assert.equal(reverse.events.find((event) => event.type === 'reactionPulse').sourceId, 'core.browning');
  const faded = fixture(['pantry', 'chorus'], entries);
  faded.contents[0].presence = .249;
  assert.equal(pulses(serve(faded, 80), 'chorus.harmony').length, 0);
});

test('Crescendo requires Browning before Extraction; a leading Citrus disables it', () => {
  const entries = [['chorus.chime-fruit', 1], ['chorus.citrus', 1], ['chorus.marrow', 1], ['chorus.gel', 1]];
  const result = serve(fixture(['pantry', 'chorus'], entries), 80);
  assert.equal(pulses(result, 'chorus.crescendo')[0].data.total, pulses(result, 'core.extraction')[0].data.total);
  const reverse = serve(fixture(['pantry', 'chorus'], [entries[1], entries[0], ...entries.slice(2)]), 80);
  assert.equal(pulses(reverse, 'chorus.crescendo').length, 0);
  assert.equal(reverse.events.find((event) => event.type === 'reactionPulse').sourceId, 'core.extraction');
});

test('Silver Note rewards three distinct positive chemistry reactions, and Tuned Rim discounts every echo', () => {
  const state = fixture(['pantry', 'chorus'], [['pantry.beef', 1], ['pantry.onion', 1], ['chorus.glass-noodle', 1], ['chorus.cream', 1], ['chorus.citrus', 1], ['chorus.gel', 1]]);
  state.residues = [{ id: 'chorus.silver-note', tier: 2 }, { id: 'chorus.tuned-rim', tier: 2 }];
  const result = serve(state, 80);
  const opener = result.events.find((event) => event.type === 'reactionPulse');
  assert.ok(Math.abs(pulses(result, 'chorus.glass-noodle')[0].data.total - opener.data.total * 3.25) < 1e-8);
  assert.equal(result.events.find((event) => event.type === 'presenceConsumed').data.amount, .05);
  assert.equal(serve(result.state, 80).events.find((event) => event.type === 'presenceConsumed').data.amount, .05);
  const two = serve(state, 110); // Infusion is inactive here.
  const first = two.events.find((event) => event.type === 'reactionPulse');
  assert.ok(Math.abs(pulses(two, 'chorus.glass-noodle')[0].data.total - first.data.total * 1.25) < 1e-8);
});

test('Pantry residues amplify named reactions without heat tax and the echo copies that amplification', () => {
  const state = fixture(['pantry', 'chorus'], [['pantry.beef', 1], ['pantry.onion', 1], ['chorus.glass-noodle', 1]]);
  const normal = serve(state, 80);
  state.residues = [{ id: 'pantry.hearth-coating', tier: 2 }];
  const boosted = serve(state, 80);
  assert.equal(pulses(boosted, 'core.browning')[0].data.total, pulses(normal, 'core.browning')[0].data.total * 2);
  assert.equal(pulses(boosted, 'chorus.glass-noodle')[0].data.total, pulses(normal, 'chorus.glass-noodle')[0].data.total * 2);
  const plan = inspectReactions({ ...state, temperature: 80 }, catalog);
  assert.equal(plan.find((entry) => entry.id === 'core.infusion').multiplier, 1);
});

test('invalid reaction plans roll back the serving and cannot mutate live state', () => {
  const state = fixture(['pantry', 'hearth'], [['hearth.smokeleaf', 1]]);
  for (const reactionPlan of [
    () => [{ kind: 'amplify', sourceId: 'hearth.invalid', reactionId: 'core.browning', factor: -1 }],
    ({ state: snapshot }) => { snapshot.contents[0].presence = 99; return []; }
  ]) {
    const broken = { ...catalog, decks: { ...catalog.decks, hearth: { ...catalog.decks.hearth, rules: { ...catalog.decks.hearth.rules, reactionPlan } } } };
    const result = step(broken, state, { type: 'serve', offerId: state.offers[0], disposition: 'discard', temperature: 80 });
    assert.equal(result.errors.length, 1);
    assert.deepEqual(result.state, state);
    assert.deepEqual(result.events, []);
  }
});
