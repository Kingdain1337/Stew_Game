import { residuePower } from '../../packages/deck-contract/helpers.js';

export const resourceCaps = {};
export const handlers = {};

export function reactionPlan({ state }) {
  const hot = residuePower(state, 'pantry.hearth-coating', 5);
  const cool = residuePower(state, 'pantry.cool-coating', 5);
  return [
    ...['core.browning', 'core.extraction'].map((reactionId) => ({ kind: 'amplify', sourceId: 'pantry.hearth-coating', reactionId, factor: 1 + .5 * hot })),
    ...['core.infusion', 'core.preservation'].map((reactionId) => ({ kind: 'amplify', sourceId: 'pantry.cool-coating', reactionId, factor: 1 + .5 * cool }))
  ].filter((operation) => operation.factor > 1);
}
