import { loadCatalog } from '../decks/catalog.js';
import { POTS, createGame, step, occupiedVolume, availableResidues } from '../packages/game-core/index.js';
import { chooseAction } from '../tools/bot-policy.js';

const frame = document.querySelector('#game');
const testCase = document.body.dataset.testCase;
const parameters = new URLSearchParams(location.search);
const mobileWidth = Number(parameters.get('width'));
if (mobileWidth) {
  frame.style.width = `${mobileWidth}px`;
  frame.style.height = `${Number(parameters.get('height')) || 740}px`;
}
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitFor = (predicate) => new Promise((resolve, reject) => {
  let tries = 0;
  const timer = setInterval(() => {
    try {
      const result = predicate();
      if (result) { clearInterval(timer); resolve(result); }
      else if (++tries > 400) { clearInterval(timer); reject(new Error('UI timeout')); }
    } catch (error) { clearInterval(timer); reject(error); }
  }, 40);
});

try {
  const catalog = await loadCatalog();
  await waitFor(() => frame.contentDocument?.querySelector('[data-pot]'));
  const page = frame.contentDocument;
  function checkMobile(label) {
    if (!mobileWidth) return;
    const viewport = frame.contentWindow;
    assert(page.documentElement.scrollWidth <= viewport.innerWidth + 1, `${label}: horizontal page overflow`);
    const dialog = page.querySelector('#level-dialog');
    if (dialog.open) {
      const rect = dialog.getBoundingClientRect();
      assert(rect.left >= 0 && rect.right <= viewport.innerWidth + 1 && rect.top >= 0 && rect.bottom <= viewport.innerHeight + 1, `${label}: dialog outside viewport`);
      assert(dialog.scrollWidth <= dialog.clientWidth + 1, `${label}: dialog horizontal overflow`);
    }
  }
  checkMobile('Welcome');
  const errors = [];
  frame.contentWindow.addEventListener('error', (event) => errors.push(event.message));
  frame.contentWindow.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
  const potId = ['royal', 'journey'].includes(testCase) ? 'royal' : 'iron';
  const storyId = ['royal', 'journey'].includes(testCase) ? 'road' : 'royal';
  const seed = testCase === 'journey' ? 1 : 123;
  let state = createGame(catalog, { seed, potId, storyId, deckIds: ['pantry', 'culture'] }).state;
  function command(action) {
    const result = step(catalog, state, action);
    assert(!result.errors.length, result.errors.join(', '));
    state = result.state;
    return result;
  }
  page.querySelector('#seed-input').value = String(seed);
  page.querySelector(`[data-pot="${potId}"]`).click();
  page.querySelector(`[data-story="${storyId}"]`).click();
  assert(!page.querySelector('#level-dialog').open, 'Pot/story selection started run early');
  page.querySelector('#start-story').click();
  await waitFor(() => page.querySelectorAll('[data-stock]').length === 3);
  checkMobile('Stocks');
  assert(page.querySelector('#pot-volume').textContent.startsWith('0.00'), 'Starting pot not empty');
  assert(page.querySelector('#serve-button').disabled, 'Can serve before stock selection');
  const stockId = state.stockOffers[0];
  assert([...page.querySelectorAll('[data-stock]')].map((el) => el.dataset.stock).join() === state.stockOffers.join(), 'Stock RNG differs');
  page.querySelector(`[data-stock="${stockId}"]`).click();
  command({ type: 'chooseStock', stockId });
  await waitFor(() => page.querySelector('#chapter-begin'));
  checkMobile('Chapter introduction');
  assert(page.querySelector('#level-dialog').textContent.includes('Chapter'), 'Missing chapter narrative');
  page.querySelector('#chapter-close').click();
  assert(!page.querySelector('#level-dialog').open && !page.querySelector('#stage-review').hidden, 'Chapter inspection traps player');
  page.querySelector('#reopen-stage').click();
  page.querySelector('#chapter-begin').click();
  command({ type: 'startChapter' });
  await waitFor(() => page.querySelector('[data-offer]'));
  checkMobile('Cooking');
  if (mobileWidth) {
    const keyword = page.querySelector('#offers [data-tooltip]');
    const firstOffer = keyword.closest('[data-offer]');
    keyword.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, pointerType:'touch' }));
    keyword.dispatchEvent(new PointerEvent('click', { bubbles:true, cancelable:true, pointerType:'touch' }));
    assert(!page.querySelector('#tooltip-popover').hidden && firstOffer.getAttribute('aria-pressed') === 'false', 'Touch keyword selected the card or failed to show its tooltip');
    page.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerType:'touch' }));
    assert(page.querySelector('#tooltip-popover').hidden, 'Touch outside failed to dismiss tooltip');
    const offers = page.querySelector('#offers');
    offers.scrollLeft = offers.scrollWidth;
    assert(offers.scrollLeft > 0, 'Mobile offer row cannot be swiped');
    offers.scrollLeft = 0;
  }
  assert(page.querySelectorAll('[data-serving-size]').length === 3, 'Missing sizes');
  assert(page.querySelectorAll('#property-totals .property-badge').length === 6 || page.querySelector('#property-totals').children.length === 6, 'Missing property totals');
  assert(page.querySelector('#residue-count').textContent.includes(`0/${POTS.find((pot) => pot.id === potId).residueSlots}`), 'Wrong residue slots');
  assert(page.querySelector('#target-score').textContent === '400', 'Target coupled to pot');

  async function serve(action, animate = false) {
    page.querySelector(`[data-offer="${action.offerId}"]`).click();
    if (action.replaceInstanceId) page.querySelector(`[data-replace="${action.replaceInstanceId}"]`).click();
    page.querySelector(`[data-serving-size="${action.servingSize}"]`).click();
    const slider = page.querySelector('#temperature-slider');
    if (!slider.disabled) {
      slider.value = action.temperature;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const result = command(action);
    const beforeStatus = page.querySelector('#round-status').textContent;
    if (!animate) page.querySelector('#skip-effects').click();
    page.querySelector(action.disposition === 'add' ? '#serve-button' : '#discard-button').click();
    await waitFor(() => page.querySelector('#round-status').textContent !== beforeStatus &&
      (page.querySelector('#level-dialog').open || !page.querySelector('[data-offer]').disabled));
    await waitFor(() => page.querySelector('#total-score').textContent === Number(state.score).toLocaleString(undefined, { maximumFractionDigits: 1 }));
    assert(!errors.length, errors.join('; '));
    checkMobile(`After bowl ${state.round}`);
    const actual = Number(page.querySelector('#pot-volume').textContent.match(/^[\d.]+/)?.[0]);
    const expected = state.contents.reduce((sum, entry) => sum + occupiedVolume(entry, catalog), 0);
    assert(Math.abs(actual - expected) < .011, 'Visible pot volume differs from rules');
    return result;
  }

  if (testCase === 'ui') {
    // Drive the real tooltip implementation at both edges, including a narrow viewport.
    for (const width of ['100%', '375px']) {
      frame.style.width = width;
      await new Promise((resolve) => setTimeout(resolve, 100));
      const probe = page.createElement('span');
      probe.dataset.tooltip = 'Acid 2 means two effective acid at React 1 and full presence. A long explanation must remain in this viewport.';
      probe.textContent = 'Acid 2';
      probe.style.cssText = 'position:fixed;right:0;top:20px';
      page.body.append(probe);
      for (const edge of ['right', 'left']) {
        probe.style.right = edge === 'right' ? '0' : 'auto';
        probe.style.left = edge === 'left' ? '0' : 'auto';
        probe.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
        probe.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        const rect = page.querySelector('#tooltip-popover').getBoundingClientRect();
        assert(rect.left >= 7 && rect.right <= frame.contentWindow.innerWidth - 7, `Tooltip clipped at ${edge}, ${width}`);
      }
      probe.remove();
      const overflowing = [...page.querySelectorAll('#game *')].filter((el) => el.getBoundingClientRect().right > frame.contentWindow.innerWidth + 1).map((el) => `${el.id || el.className}:${Math.round(el.getBoundingClientRect().right)}`).slice(0, 16);
      assert(page.documentElement.scrollWidth <= frame.contentWindow.innerWidth + 1, `Horizontal page overflow at ${width}: ${overflowing.join(', ')}`);
    }
    frame.style.width = '100%';
    assert(frame.contentWindow.getComputedStyle(page.querySelector('#chemistry-dock')).position === 'sticky', 'Reactions not pinned');
    await waitFor(() => [...page.querySelectorAll('.card-art, #pot-art, #audience img')].every((img) => img.complete && img.naturalWidth >= 128));
  }

  if (['serving', 'ui', 'royal'].includes(testCase)) {
    const offerId = state.offers[0];
    page.querySelector(`[data-offer="${offerId}"]`).click();
    page.querySelector('[data-serving-size="small"]').click();
    const smallPreview = page.querySelector('#preview-summary').textContent;
    page.querySelector('[data-serving-size="large"]').click();
    assert(smallPreview !== page.querySelector('#preview-summary').textContent, 'Serving preview did not change');
    await serve({ type: 'serve', offerId, disposition: 'add', temperature: 50, servingSize: 'large' });
    assert(page.querySelector('#breakdown').textContent.includes('serving'), 'Missing portion breakdown');
  } else {
    let rewards = 0, sawBroth = false, sawPrincess = false, upgraded = false, sawCurse = false, sawLockedHeat = false;
    const limit = testCase === 'journey' ? 50 : testCase === 'stage' ? 5 : testCase === 'residue' ? 16 : 24;
    for (let turn = 0; turn < limit; turn++) {
      if (state.phase === 'lost') throw new Error(`Fixture lost at chapter ${state.encounterIndex + 1}`);
      if (state.phase === 'reward') {
        const dialog = page.querySelector('#level-dialog');
        assert(dialog.open, 'Reward missing');
        assert(page.querySelector('#breakdown .breakdown-item'), 'Last bowl unavailable');
        page.querySelector('#inspect-run').click();
        assert(!dialog.open && !page.querySelector('#stage-review').hidden, 'Inspection blocked');
        page.querySelector('#reopen-stage').click();
        assert(dialog.open, 'Cannot reopen reward');
        const options = availableResidues(state, catalog);
        const full = state.residues.length >= POTS.find((pot) => pot.id === potId).residueSlots;
        const residue = full ? null : testCase === 'journey' ? options.find((entry) => entry.deckId === 'culture') ?? options[0] : options.find((entry) => entry.id === 'pantry.hearth-coating') ?? options.find((entry) => entry.deckId === 'culture');
        if (residue) {
          assert(!page.querySelector('#residue-replacement'), 'Free slots requested replacement');
          assert([...page.querySelectorAll('[data-residue]')].every((button) => !state.residues.some((entry) => entry.id === button.dataset.residue)), 'Duplicate upgrade offered');
          page.querySelector(`[data-residue="${residue.id}"]`).click();
        } else page.querySelector('#keep-residue').click();
        command({ type: 'chooseResidue', residueId: residue?.id ?? null });
        rewards++;
        assert(page.querySelectorAll('[data-residue-installed]').length === state.residues.length, 'Installed residues missing');
        page.querySelector('#chapter-begin').click();
        command({ type: 'startChapter' });
      }
      if (state.encounterIndex === 2 && storyId === 'royal') {
        sawPrincess = true;
        assert(page.querySelector('[data-serving-size="large"]').disabled, 'Princess allows large bowls');
        assert(page.querySelector('#boss-turn').textContent.includes('Royal request'), 'Request absent');
      }
      if (state.disabledResidueIds.length) {
        sawCurse = true;
        assert(page.querySelector('.residue-row.silenced') && page.querySelector('#boss-turn').textContent.includes('Silenced'), 'Witch curse not shown');
      }
      if (state.bossTurn.forcedHeat !== null) {
        sawLockedHeat = true;
        assert(page.querySelector('#temperature-slider').disabled && Number(page.querySelector('#temperature-slider').value) === state.bossTurn.forcedHeat, 'Dragon heat not locked in UI');
      }
      if (testCase === 'journey' && [2, 9].includes(state.encounterIndex)) assert(page.querySelector('[data-serving-size="small"]').disabled, 'Large-only boss permits small');
      const action = chooseAction(catalog, state, testCase === 'journey' ? 'engineAware' : 'immediate');
      const result = await serve(action);
      sawBroth ||= !!page.querySelector('.broth-row');
      upgraded ||= result.events.some((event) => event.type === 'residueLeveled');
      if (testCase === 'broth' && sawBroth) {
        assert(page.querySelector('.broth-row').textContent.includes('0.25 Sugar'), 'Wrong broth properties');
        break;
      }
    }
    if (testCase === 'stage') {
      const dialog = page.querySelector('#level-dialog');
      assert(dialog.open, 'Missing end-of-stage prompt');
      page.querySelector('#inspect-run').click();
      assert(!dialog.open && !page.querySelector('#stage-review').hidden && page.querySelector('#breakdown .breakdown-item'), 'End-of-stage inspection blocked');
      page.querySelector('#reopen-stage').click();
      assert(dialog.open, 'Cannot reopen stage');
    }
    if (testCase === 'residue') {
      assert(rewards >= 3 && sawPrincess, 'Did not reach three rewards and princess');
      assert(page.querySelector('.residue-objective') && page.querySelector('#residues progress'), 'Objective progress not visible');
      assert(upgraded, `No objective upgrade occurred in the browser fixture: ${JSON.stringify(state.residues)}`);
      document.body.dataset.objectiveLeveled = String(upgraded);
    }
    if (testCase === 'broth') assert(sawBroth, 'No broth after 24 bowls');
    if (testCase === 'journey') {
      assert(state.phase === 'won' && rewards === 9 && sawCurse && sawLockedHeat, 'Incomplete story/boss coverage');
      assert(page.querySelector('#level-dialog').textContent.includes('Story complete'), 'Ending not displayed');
      document.body.dataset.bowls = '50';
      document.body.dataset.chapters = '10';
    }
  }
  assert(!errors.length, errors.join('; '));
  document.body.dataset.smokeResult = 'pass';
} catch (error) {
  document.body.dataset.smokeResult = 'fail';
  document.body.dataset.error = error.stack ?? error.message;
}
