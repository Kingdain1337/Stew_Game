import { oldest, operational, residuePower, withTag } from '../../packages/deck-contract/helpers.js';

export const resourceCaps = { char: 6 };

function preServe({ state, cards }) {
  const intents = [];
  let char = state.deckState.hearth.resources.char ?? 0;
  const temperature = state.temperature;
  if (temperature >= 90) {
    const furnace = oldest(withTag(state, { cards }, 'furnaceSource'));
    const fuel = oldest(state.contents.filter((entry) => !cards[entry.cardId].system && (cards[entry.cardId].properties.protein ?? 0) > 0 && operational(entry)));
    if (furnace && fuel) {
      const tier = residuePower(state, 'hearth.banked-embers', 5);
      const cost = .2 - .05 * tier;
      intents.push({ kind: 'consume', sourceId: furnace.cardId, targetId: fuel.instanceId, amount: cost });
      if (char < 6) {
        intents.push({ kind: 'resource', sourceId: furnace.cardId, targetIds: [fuel.instanceId], resource: 'char', amount: 1, label: 'Protein becomes Char' });
        char++;
      } else {
        const pear = oldest(withTag(state, { cards }, 'overflowBooster'));
        const total = 120 * (1 + .75 * tier) * (pear ? 1.5 : 1);
        intents.push({ kind: 'pulse', sourceId: 'hearth.overflow', origin: 'original', echoable: true,
          participantIds: [...new Set([furnace.instanceId, fuel.instanceId, ...(pear ? [pear.instanceId] : [])])],
          deltas: [{ instanceId: furnace.instanceId, amount: total }] });
      }
    }
  }
  if (temperature >= 110 && char >= 3) {
    const recipients = state.contents.filter((entry) => !cards[entry.cardId].system && operational(entry));
    if (recipients.length) {
      const truffle = withTag(state, { cards }, 'blazeBooster').length > 0;
      const tier = residuePower(state, 'hearth.coal-keeper', 3);
      const total = char * (truffle ? 80 : 60) * (char === 6 ? 1 + .5 * tier : 1);
      const weight = recipients.reduce((sum, entry) => sum + entry.presence, 0);
      intents.push({ kind: 'resource', sourceId: 'hearth.blaze', resource: 'char', amount: -char, label: 'Char cashed out in a Blaze' });
      intents.push({ kind: 'pulse', sourceId: 'hearth.blaze', origin: 'original', echoable: true,
        deltas: recipients.map((entry) => ({ instanceId: entry.instanceId, amount: total * entry.presence / weight })) });
      char = residuePower(state, 'hearth.ash-memory', 3);
      if (char) intents.push({ kind: 'resource', sourceId: 'hearth.ash-memory', resource: 'char', amount: char, label: 'Ash Memory restores Char after Blaze' });
    }
  }
  if (temperature >= 40 && temperature <= 60 && char >= 1) {
    const keeper = oldest(withTag(state, { cards }, 'charKeeper'));
    const candidates = state.contents.filter((entry) => !cards[entry.cardId].system && entry.instanceId !== keeper?.instanceId && operational(entry));
    const furnace = oldest(candidates.filter((entry) => cards[entry.cardId].tags.includes('furnaceSource')));
    const fuel = oldest(candidates.filter((entry) => cards[entry.cardId].properties.protein));
    const targets = [...new Set([furnace, fuel].filter(Boolean))];
    if (keeper && targets.length) {
      intents.push({ kind: 'resource', sourceId: keeper.cardId, targetIds: targets.map((entry) => entry.instanceId), resource: 'char', amount: -1, label: 'Char protects furnace and fuel' });
      for (const target of targets) intents.push({ kind: 'retention', sourceId: keeper.cardId, targetId: target.instanceId, fraction: 0.96 });
      char--;
    }
  }
  const payoff = oldest(withTag(state, { cards }, 'charPayoff'));
  if (payoff && char > 0) {
    intents.push({ kind: 'pulse', sourceId: 'hearth.char-payoff', origin: 'original', echoable: false,
      deltas: [{ instanceId: payoff.instanceId, amount: 25 * char * payoff.presence }] });
  }
  return intents;
}

function encounterStart({ state }) {
  const tier = residuePower(state, 'hearth.coal-keeper', 3);
  const char = state.deckState.hearth.resources.char ?? 0;
  const amount = Math.min(2 * tier, 6 - char);
  return amount > 0 ? [{ kind: 'resource', sourceId: 'hearth.coal-keeper', resource: 'char', amount }] : [];
}

export const handlers = { preServe, encounterStart };

export function reactionPlan({ state, cards }) {
  const char = state.deckState.hearth.resources.char ?? 0;
  const furnace = oldest(withTag(state, { cards }, 'furnaceSource'));
  const operations = furnace && char > 0 ? [{ kind: 'amplify', sourceId: furnace.cardId, reactionId: 'core.browning', factor: 1 + .2 * char }] : [];
  const glaze = residuePower(state, 'hearth.red-glaze', 5);
  if (glaze && char >= 3) operations.push({ kind: 'amplify', sourceId: 'hearth.red-glaze', reactionId: 'core.browning', factor: 1 + .5 * glaze });
  return operations;
}
