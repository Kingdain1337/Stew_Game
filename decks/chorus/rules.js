import { oldest, residueTier, withTag } from '../../packages/deck-contract/helpers.js';

export const resourceCaps = {};

function preServe({ state, cards }) {
  if (state.temperature < 40 || state.temperature > 60) return [];
  const keeper = oldest(withTag(state, { cards }, 'echoKeeper'));
  const source = oldest([...withTag(state, { cards }, 'echoStrong'), ...withTag(state, { cards }, 'echoWeak')]);
  return keeper && source ? [{ kind: 'retention', sourceId: keeper.cardId, targetId: source.instanceId, fraction: 0.96 }] : [];
}

function derived({ state, cards, originalPulses }) {
  const positive = originalPulses.filter((pulse) => pulse.deltas.some((delta) => delta.amount > 0));
  const original = positive.find((pulse) => pulse.echoable);
  const intents = [];
  const source = oldest(withTag(state, { cards }, 'echoStrong')) ?? oldest(withTag(state, { cards }, 'echoWeak'));
  const chemistry = positive.filter((pulse) => pulse.sourceId.startsWith('core.'));
  if (original && source) {
    const tunedTier = residueTier(state, 'chorus.tuned-rim');
    const cost = [.1, .08, .05, .02][tunedTier];
    const chemistryCount = new Set(positive.filter((pulse) => pulse.sourceId.startsWith('core.')).map((pulse) => pulse.sourceId)).size;
    const silverTier = chemistryCount >= 3 ? residueTier(state, 'chorus.silver-note') : 0;
    const factor = (cards[source.cardId].tags.includes('echoStrong') ? 1.25 : .75) + silverTier;
    intents.push(
      { kind: 'consume', sourceId: source.cardId, targetId: source.instanceId, amount: cost },
      { kind: 'pulse', sourceId: source.cardId, origin: 'derived', parentIds: [original.eventId], participantIds: original.participantIds,
        deltas: original.deltas.map((delta) => ({ instanceId: delta.instanceId, amount: delta.amount * factor })) }
    );
  }
  const encore = residueTier(state, 'chorus.encore');
  if (source && encore && new Set(chemistry.map((pulse) => pulse.sourceId)).size >= 3) {
    const last = chemistry.at(-1);
    intents.push({ kind: 'pulse', sourceId: 'chorus.encore', origin: 'derived', parentIds: [last.eventId], participantIds: [...new Set([source.instanceId, ...last.participantIds])],
      deltas: last.deltas.map((delta) => ({ instanceId: delta.instanceId, amount: delta.amount * (encore === 1 ? .35 : .65) })) });
  }
  // These recipes inspect actual scored order, not the list of possible reactions.
  for (const recipe of [
    { tag: 'harmonyPayoff', first: 'core.infusion', second: 'core.browning', sourceId: 'chorus.harmony' },
    { tag: 'crescendoPayoff', first: 'core.browning', second: 'core.extraction', sourceId: 'chorus.crescendo' }
  ]) {
    const performer = oldest(withTag(state, { cards }, recipe.tag));
    const first = positive.findIndex((pulse) => pulse.sourceId === recipe.first);
    const second = positive.findIndex((pulse) => pulse.sourceId === recipe.second);
    if (!performer || first < 0 || second <= first) continue;
    const earlier = positive[first], later = positive[second];
    intents.push({ kind: 'pulse', sourceId: recipe.sourceId, origin: 'derived', parentIds: [earlier.eventId, later.eventId],
      participantIds: [...new Set([performer.instanceId, ...(earlier.participantIds ?? []), ...(later.participantIds ?? [])])],
      deltas: later.deltas.map((delta) => ({ instanceId: delta.instanceId, amount: delta.amount * performer.presence * [1, 1.5, 2.5][residueTier(state, 'chorus.counterpoint')] })) });
  }
  return intents;
}

export const handlers = { preServe, derived };

export function reactionPlan({ state, cards }) {
  const conductors = state.contents.filter((entry) => entry.presence >= .25 && cards[entry.cardId].tags.some((tag) => tag.startsWith('conduct')))
    .sort((a, b) => a.addedAt - b.addedAt || a.instanceId.localeCompare(b.instanceId));
  return conductors.map((entry) => ({ kind: 'lead', sourceId: entry.cardId,
    reactionId: cards[entry.cardId].tags.includes('conductInfusion') ? 'core.infusion'
      : cards[entry.cardId].tags.includes('conductExtraction') ? 'core.extraction'
        : state.temperature <= 60 ? 'core.preservation' : 'core.browning' }));
}
