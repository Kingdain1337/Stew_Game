import { residueTier } from '../../packages/deck-contract/helpers.js';

export const resourceCaps = {};
export const handlers = {};

export function reactionPlan({ state }) {
  const hot = residueTier(state, 'pantry.hearth-coating');
  const cool = residueTier(state, 'pantry.cool-coating');
  return [
    ...['core.browning', 'core.extraction'].map((reactionId) => ({ kind: 'amplify', sourceId: 'pantry.hearth-coating', reactionId, factor: 1 + .5 * hot })),
    ...['core.infusion', 'core.preservation'].map((reactionId) => ({ kind: 'amplify', sourceId: 'pantry.cool-coating', reactionId, factor: 1 + .5 * cool }))
  ].filter((operation) => operation.factor > 1);
}
