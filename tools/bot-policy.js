import { POTS, SERVING_SIZES, getEncounter, encounterTarget, occupiedVolume, preview } from '../packages/game-core/index.js';

// A bounded one-bowl diagnostic policy, not an optimal player or a difficulty promise.
export function chooseAction(catalog, state, policy = 'engineAware') {
  const snapshot = { ...state, commandLog: [], lastEvents: [], lastBreakdown: null };
  const pot = POTS.find((entry) => entry.id === state.potId);
  const used = state.contents.reduce((sum, entry) => sum + occupiedVolume(entry, catalog), 0);
  const required = getEncounter(state).boss?.requiredSize;
  const sizes = required ? [required] : SERVING_SIZES.map((entry) => entry.id);
  const temperatures = state.bossTurn.forcedHeat !== null ? [state.bossTurn.forcedHeat] : [40, 50, 60, 70, 80, 90, 100, 110];
  let best;
  for (const offerId of state.offers) {
    const replacements = used + catalog.cards[offerId].volume > pot.capacity
      ? state.contents.map((entry) => entry.instanceId) : [null];
    for (const disposition of ['add', 'discard']) {
      if (disposition === 'discard' && offerId !== state.offers[0]) continue;
      for (const replaceInstanceId of disposition === 'add' ? replacements : [null]) {
        for (const temperature of temperatures) for (const servingSize of sizes) {
          const action = { type: 'serve', offerId, disposition, temperature, servingSize, ...(replaceInstanceId ? { replaceInstanceId } : {}) };
          const result = preview(catalog, snapshot, action);
          if (result.errors.length) continue;
          let value = result.explanation.total;
          if (policy === 'engineAware') {
            // Once this chapter is secure, surplus points cannot buy the next
            // chapter. Preserve ingredients and bank resources instead.
            value = Math.min(value, Math.max(0, encounterTarget(state) - state.score));
            value += 36 * ((result.state.deckState.culture?.resources.culture ?? 0) - (state.deckState.culture?.resources.culture ?? 0));
            value += 25 * ((result.state.deckState.hearth?.resources.char ?? 0) - (state.deckState.hearth?.resources.char ?? 0));
            value += .6 * result.state.contents.reduce((sum, entry) => sum + (catalog.cards[entry.cardId].basePower ?? 0) * (entry.presence ?? 0), 0);
            if (state.encounterIndex === 0 && state.round === 0 && disposition === 'add' && catalog.cards[offerId].tags.some((tag) => ['cultureSource', 'furnaceSource', 'echoStrong', 'echoWeak'].includes(tag))) value += 110;
            if (result.state.phase === 'lost') value -= 5000;
          }
          if (!best || value > best.value) best = { action, value };
        }
      }
    }
  }
  if (!best) throw new Error('Diagnostic policy found no legal serving');
  return best.action;
}
