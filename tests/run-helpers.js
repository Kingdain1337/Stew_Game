import { createGame, step } from '../packages/game-core/index.js';
export function beginRun(catalog, options = {}) {
  const initial = createGame(catalog, options);
  const stock = step(catalog, initial.state, { type: 'chooseStock', stockId: initial.state.stockOffers[0] });
  const chapter = step(catalog, stock.state, { type: 'startChapter' });
  if (stock.errors.length || chapter.errors.length) throw new Error([...stock.errors, ...chapter.errors].join(', '));
  return { ...chapter, events: [...initial.events, ...stock.events, ...chapter.events] };
}
