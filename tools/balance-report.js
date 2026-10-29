import { readFile } from 'node:fs/promises';
import { loadCatalog } from '../decks/catalog.js';
import { POTS, STORIES, getStory, availableResidues, createGame, step } from '../packages/game-core/index.js';
import { chooseAction } from './bot-policy.js';

const catalog = await loadCatalog(async (url) => JSON.parse(await readFile(url, 'utf8')));
const seedCount = Number(process.argv[2] ?? 4);
if (!Number.isInteger(seedCount) || seedCount < 1 || seedCount > 200) throw new Error('Give a seed count from 1 to 200');
const potId = process.argv[4] ?? 'iron';
const storyId = process.argv[5] ?? 'royal';
if (!POTS.some((pot) => pot.id === potId)) throw new Error('Pot must be iron or royal');
if (!STORIES.some((story) => story.id === storyId)) throw new Error('Story must be royal or road');
const encounters = getStory({ storyId }).chapters;
const targetArgument = process.argv[3] ?? '1';
if (targetArgument.includes(',')) {
  const targets = targetArgument.split(',').map(Number);
  if (targets.length !== encounters.length || targets.some((target) => !Number.isInteger(target) || target <= 0)) throw new Error(`Give ${encounters.length} positive integer targets`);
  encounters.forEach((encounter, index) => { encounter.target = targets[index]; });
} else {
  const scale = Number(targetArgument);
  if (!Number.isFinite(scale) || scale <= 0 || scale > 2) throw new Error('Target scale must be greater than 0 and at most 2');
  for (const encounter of encounters) encounter.target = Math.round(encounter.target * scale);
}
const profiles = [
  ['pantry', 'culture'], ['pantry', 'hearth'], ['pantry', 'chorus'],
  ['pantry', 'culture', 'chorus'], ['pantry', 'culture', 'hearth'], ['pantry', 'hearth', 'chorus']
].filter((ids) => !process.argv[6] || ids.slice(1).join('+') === process.argv[6]);

function play(deckIds, seed, policy) {
  let result = createGame(catalog, { deckIds, seed, potId, storyId });
  const encounterScores = [];
  const triggers = { overflow: 0, blaze: 0, harmony: 0, crescendo: 0, replacements: 0, levels: 0, small: 0, standard: 0, large: 0 };
  for (let commands = 0; commands < 100 && !['lost', 'won'].includes(result.state.phase); commands++) {
    const state = result.state;
    let action;
    if (state.phase === 'stock') action = { type: 'chooseStock', stockId: state.stockOffers[0] };
    else if (state.phase === 'chapter') action = { type: 'startChapter' };
    else if (state.phase === 'reward') {
      const options = availableResidues(state, catalog);
      const full = state.residues.length >= POTS.find((pot) => pot.id === potId).residueSlots;
      const pick = full ? null : options.find((residue) => residue.deckId !== 'pantry' && deckIds.includes(residue.deckId)) ?? options[0];
      action = { type: 'chooseResidue', residueId: pick?.id ?? null };
    } else {
      action = chooseAction(catalog, state, policy);
      if (action.replaceInstanceId) triggers.replacements++;
      triggers[action.servingSize]++;
    }
    result = step(catalog, state, action);
    if (result.errors.length) throw new Error(result.errors.join(', '));
    if (action.type !== 'serve') continue;
    if (result.state.phase !== 'serving') encounterScores.push(result.state.score);
    for (const key of ['overflow', 'blaze', 'harmony', 'crescendo']) triggers[key] += result.events.filter((event) => event.type === 'reactionPulse' && event.sourceId === `${['overflow', 'blaze'].includes(key) ? 'hearth' : 'chorus'}.${key}`).length;
    triggers.levels += result.events.filter((event) => event.type === 'residueLeveled').length;
  }
  return { phase: result.state.phase, encountersCleared: result.state.encounterIndex + (result.state.phase === 'won' ? 1 : 0), totalScore: result.state.totalScore, encounterScores, triggers };
}
const rows = [];
for (const deckIds of profiles) for (const policy of ['immediate', 'engineAware']) {
  const outcomes = Array.from({ length: seedCount }, (_, index) => play(deckIds, index + 1, policy));
  rows.push({
    decks: deckIds.slice(1).join('+'), policy, seeds: seedCount,
    firstWins: outcomes.filter((outcome) => outcome.encountersCleared >= 1).length,
    runWins: outcomes.filter((outcome) => outcome.phase === 'won').length,
    meanEncounterScores: encounters.map((_, index) => {
      const values = outcomes.map((outcome) => outcome.encounterScores[index]).filter((value) => value !== undefined);
      return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : '—';
    }).join(' / '),
    triggers: Object.keys(outcomes[0].triggers).map((key) => outcomes.reduce((sum, outcome) => sum + outcome.triggers[key], 0)).join('/'),
    averageCleared: Number((outcomes.reduce((sum, outcome) => sum + outcome.encountersCleared, 0) / seedCount).toFixed(2))
  });
}
console.log(`Pot: ${potId}. Story: ${storyId}. Targets: ${encounters.map((entry) => entry.target).join(' / ')}. ${seedCount} seeds per profile. Bounded greedy diagnostics, not human players.`);
console.table(rows);
console.log('Triggers = overflow / blaze / harmony / crescendo / capacity replacements / objective levels / small / standard / large.');
