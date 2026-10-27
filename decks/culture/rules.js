import { effectiveProperty, oldest, propertyParticipants, residueTier, withTag } from '../../packages/deck-contract/helpers.js';

export const resourceCaps = { culture: 6 };

function preServe({ state, cards }) {
  const intents = [];
  const resource = state.deckState.culture.resources.culture ?? 0;
  const temperature = state.temperature;
  if (temperature >= 40 && temperature <= 60) {
    const source = oldest(withTag(state, { cards }, 'cultureSource'));
    if (source && effectiveProperty(state, { cards }, 'sugar') >= 1 && resource < 6) {
      const booster = withTag(state, { cards }, 'cultureBooster').length ? 1 : 0;
      const glazeTier = residueTier(state, 'culture.sugar-glaze');
      const amount = Math.min(6 - resource, 1 + booster + glazeTier);
      intents.push({ kind: 'resource', sourceId: source.cardId, targetIds: [source.instanceId], resource: 'culture', amount, label: 'Culture grows in the cool' });
    }
    const keeper = oldest(withTag(state, { cards }, 'cultureKeeper'));
    if (keeper && source) intents.push({ kind: 'retention', sourceId: keeper.cardId, targetId: source.instanceId, fraction: 0.96 });
  }
  if (temperature >= 90 && resource > 0) {
    const acid = effectiveProperty(state, { cards }, 'acid');
    if (acid > 0) {
      const participants = propertyParticipants(state, { cards }, 'acid');
      const dropTier = residueTier(state, 'culture.last-drop');
      const total = 30 * resource * Math.min(acid, 3) * (resource === 6 ? 1 + .5 * residueTier(state, 'culture.sugar-glaze') : 1) * (acid >= 2.5 ? 1 + .4 * dropTier : 1);
      intents.push({ kind: 'resource', sourceId: 'culture.harvest', resource: 'culture', amount: -resource, label: 'Culture spent in harvest' });
      intents.push({
        kind: 'pulse', sourceId: 'culture.harvest', origin: 'original', echoable: true,
        deltas: participants.map((entry) => ({
          instanceId: entry.instanceId,
          amount: total * (cards[entry.cardId].properties.acid * cards[entry.cardId].reactivity * entry.presence / acid)
        }))
      });
      const tier = residueTier(state, 'culture.seasoned-crock');
      if (tier && resource >= 4) {
        intents.push({ kind: 'resource', sourceId: 'culture.seasoned-crock', resource: 'culture', amount: tier, label: 'Seasoned Crock retains a culture' });
      }
    }
  }
  return intents;
}

export const handlers = { preServe };

export function reactionPlan({ state }) {
  const tier = residueTier(state, 'culture.living-lid');
  return tier && (state.deckState.culture.resources.culture ?? 0) >= 3
    ? [{ kind: 'amplify', sourceId: 'culture.living-lid', reactionId: 'core.preservation', factor: tier === 1 ? 1.5 : 2.25 }] : [];
}
