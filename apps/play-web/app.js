import { loadCatalog } from '../../decks/catalog.js';
import { BROTH_CARD_ID, activeDeckIds, POTS, STORIES, SERVING_SIZES, getStory, getEncounter, availableResidues, createGame, encounterTarget, starThresholds, inspectReactions, occupiedVolume, preview, step } from '../../packages/game-core/index.js';
import { effectiveProperty } from '../../packages/deck-contract/helpers.js';
import { audienceReaction, bossDemandText } from '../../stories/catalog.js';
import { playEvents, describeEvent } from './presentation.js';
import { glossaryHtml, heatSummary, highlightKeywords, keyword, propertyBadge } from './card-guide.js';
import { createPotPhysics } from './pot-physics.js';
import { installTooltips } from './tooltips.js';

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const format = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });

let catalog;
let state;
let selectedDecks = ['culture'];
let selectedStory = 'royal';
let selectedPot = 'iron';
let plannedSize = 'standard';
let selectedOffer = null;
let replacement = null;
let plannedTemperature = 80;
let busy = false;
let speed = 1;
let skipEffects = false;
let soundEnabled = false;
const potPhysics = createPotPhysics($('#pot-interior'), $('#pot-bubbles'));
const tooltips = installTooltips($('#tooltip-popover'));

function deckIdOf(sourceId) { return sourceId?.split('.')[0] ?? 'pantry'; }
function deckOfCard(card) { return catalog.decks[card.deckId]; }
function contentVolume() { return state.contents.reduce((sum, entry) => sum + occupiedVolume(entry, catalog), 0); }

function renderWelcome() {
  if (!$('#seed-input').value) $('#seed-input').value = String(Date.now() >>> 0);
  $('#story-choices').innerHTML = STORIES.map((story) => `<button type="button" class="story-choice ${story.id === selectedStory ? 'selected' : ''}" data-story="${story.id}" aria-pressed="${story.id === selectedStory}"><strong>${escapeHtml(story.name)}</strong><small>${escapeHtml(story.description)}</small><span>${story.arcs.length} arcs · ${story.chapters.length} chapters · ${story.chapters.filter((entry) => entry.boss).length} bosses</span></button>`).join('');
  const story = STORIES.find((entry) => entry.id === selectedStory);
  $('#deck-choices').innerHTML = [story.signatureDeckId, ...story.recommendedDeckIds].map((id, index) => {
    const deck = catalog.decks[id];
    return `<button type="button" class="deck-choice ${selectedDecks.includes(id) ? 'selected' : ''}" data-deck="${id}" style="--deck-color:${deck.color};--deck-pale:${deck.pale}" aria-pressed="${selectedDecks.includes(id)}"><span class="deck-symbol">${deck.symbol}</span><strong>${escapeHtml(deck.name)}</strong><span class="deck-role">${index === 0 ? 'Story deck' : 'Recommended alternative'}</span><small>${escapeHtml(deck.description)}</small></button>`;
  }).join('');
  $('#pot-choices').innerHTML = POTS.map((pot) => `<button type="button" class="pot-choice ${pot.id === selectedPot ? 'selected' : ''}" data-pot="${pot.id}" aria-pressed="${pot.id === selectedPot}"><img src="assets/pots/${pot.id}.png" alt="" loading="lazy"><strong>${escapeHtml(pot.name)}</strong><span>${pot.capacity} L ingredient capacity · ${pot.residueSlots} residue slots</span><small>${escapeHtml(pot.text)}</small></button>`).join('');
  document.querySelectorAll('[data-deck]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.deck;
    selectedDecks = [id];
    const previousSeed = $('#seed-input').value;
    renderWelcome();
    $('#seed-input').value = previousSeed;
  }));
  document.querySelectorAll('[data-pot]').forEach((button) => button.addEventListener('click', () => { selectedPot = button.dataset.pot; renderWelcome(); }));
  document.querySelectorAll('[data-story]').forEach((button) => button.addEventListener('click', () => { selectedStory = button.dataset.story; selectedDecks = [STORIES.find((entry) => entry.id === selectedStory).signatureDeckId]; renderWelcome(); }));
}

function startGame() {
  const seed = Number($('#seed-input').value);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) { $('#seed-input').focus(); return; }
  const result = createGame(catalog, { deckIds: ['pantry', ...selectedDecks], potId: selectedPot, storyId: selectedStory, seed });
  state = result.state;
  selectedOffer = null;
  replacement = null;
  plannedTemperature = state.temperature;
  plannedSize = 'standard';
  $('#welcome').hidden = true;
  $('#game').hidden = false;
  $('#performance-label').textContent = `Run seed ${seed}. Choose a starting stock.`;
  $('#event-log').innerHTML = '';
  render();
  showDialog();
}

function renderStatus() {
  const encounter = getEncounter(state);
  const story = getStory(state);
  const pot = POTS.find((entry) => entry.id === state.potId);
  const target = encounterTarget(state);
  $('#customer-card').innerHTML = `<p class="eyebrow">${escapeHtml(story.name)} · Arc ${encounter.arc + 1}: ${escapeHtml(story.arcs[encounter.arc])} · Chapter ${encounter.chapter}/${story.chapters.length} ${encounter.boss ? '· BOSS' : ''}</p><h2>${escapeHtml(encounter.name)}</h2><p class="customer-modifier">${escapeHtml(encounter.text)}</p><small>${encounter.servings - state.round} bowls remain · ${escapeHtml(bossDemandText(encounter))}</small><button type="button" class="quiet-button chapter-recap" id="chapter-recap">Read chapter</button>`;
  $('#chapter-recap').disabled = busy;
  $('#chapter-recap').addEventListener('click', () => showChapterCard(true));
  $('#total-score').textContent = format(state.score);
  $('#target-score').textContent = format(target);
  const [, skilled, engine] = starThresholds(encounter);
  $('#score-meter').style.width = `${Math.min(100, 100 * state.score / engine)}%`;
  let starGoals = $('#star-goals');
  if (!starGoals) {
    starGoals = document.createElement('div');
    starGoals.id = 'star-goals';
    starGoals.className = 'star-goals';
    $('#score-meter').parentElement.insertAdjacentElement('afterend', starGoals);
  }
  const sources = state.encounterPulseSources?.length ?? 0;
  const bossReady = !encounter.boss?.requiredTypes || state.encounterTypes.length >= encounter.boss.requiredTypes;
  starGoals.innerHTML = `<span class="${state.score >= target && bossReady ? 'reached' : ''}">★ ${format(target)} pass</span><span class="${state.score >= skilled && sources >= 1 && bossReady ? 'reached' : ''}">★★ ${format(skilled)} + 1 reaction</span><span class="${state.score >= engine && state.encounterMaxConcurrentSources >= 2 && bossReady ? 'reached' : ''}">★★★ ${format(engine)} + 2 in one bowl</span>`;
  $('#round-status').textContent = state.phase === 'serving' ? `Serving ${state.round + 1} of ${encounter.servings} · ${state.deckIds.filter((id) => id !== 'pantry').map((id) => catalog.decks[id].name).join(' + ')}` : `Encounter ${state.phase}`;
  $('#secured-hint').hidden = state.phase !== 'serving' || state.score < target || (encounter.boss?.requiredTypes && state.encounterTypes.length < encounter.boss.requiredTypes);
  renderAudience(state.score);
  const conditions = [];
  if (encounter.boss?.requiredSize) conditions.push(`Only ${encounter.boss.requiredSize} bowls.`);
  if (encounter.boss?.requiredTypes) conditions.push(`Bandit variety: ${state.encounterTypes.length}/${encounter.boss.requiredTypes} ingredient types.`);
  if (state.bossTurn.forcedHeat !== null) conditions.push(`Dragon's flame: ${state.bossTurn.forcedHeat}°C locked this bowl.`);
  if (state.bossTurn.giftCardId) conditions.push(`Royal request: add ${catalog.cards[state.bossTurn.giftCardId].name} for ×1.35 bowl points.`);
  if (state.disabledResidueIds.length) conditions.push(`Silenced this bowl: ${state.disabledResidueIds.map((id) => catalog.residues[id].name).join(', ')}. No effect or objective progress.`);
  $('#boss-turn').textContent = conditions.join(' ');
  $('#boss-turn').hidden = !conditions.length;
  $('#temperature').textContent = String(plannedTemperature);
  $('#temperature-slider').value = String(plannedTemperature);
  $('#heat-note').textContent = plannedTemperature < 40 ? 'chilled' : plannedTemperature < 70 ? 'growing' : plannedTemperature < 90 ? 'simmering' : 'roaring';
  $('#pot-name').textContent = pot.name;
  $('#pot-art').src = `assets/pots/${pot.id}.png`;
  $('#capacity-badge').textContent = `${pot.capacity} L`;
  const ingredientCount = state.contents.filter((entry) => entry.cardId !== BROTH_CARD_ID).length;
  $('#pot-volume').textContent = `${contentVolume().toFixed(2)} / ${pot.capacity} L occupied · ${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'}${state.contents.some((entry) => entry.cardId === BROTH_CARD_ID) ? ' + broth' : ''}`;
  $('#broth-note').innerHTML = `Below 0.15 presence, a remnant joins ${keyword('Broth')}: 0.25 of five properties, no Fat, and up to 18 base Power.`;
  $('#pot-visual').style.setProperty('--heat', `${Math.min(1, plannedTemperature / 120)}`);
  potPhysics.setHeat(plannedTemperature);
  document.querySelectorAll('.steam').forEach((element) => { element.style.opacity = String(Math.max(0.15, plannedTemperature / 120)); });
}

function renderAudience(score) {
  const encounter = getEncounter(state), response = audienceReaction(encounter, score, encounterTarget(state));
  const panel = $('#audience');
  if (panel.dataset.chapter !== encounter.id) {
    panel.dataset.chapter = encounter.id;
    panel.innerHTML = `<img class="audience-portrait" src="assets/characters/${encounter.portrait}.png" alt="${escapeHtml(encounter.name)}"><div><strong class="audience-mood"></strong><span class="audience-progress"></span></div>`;
    panel.dataset.lastScore = '0';
    panel.dataset.lastSpeech = '0';
    panel.dataset.speechIndex = '0';
  }
  const lastScore = Number(panel.dataset.lastScore);
  const lastSpeech = Number(panel.dataset.lastSpeech);
  const oldLevel = Number(panel.dataset.level ?? 0);
  if (score > lastScore && (response.level > oldLevel || score - lastSpeech >= Math.max(35, encounterTarget(state) * .14))) {
    const phrases = response.lines;
    const index = Number(panel.dataset.speechIndex);
    const bubble = document.createElement('span');
    bubble.className = 'audience-speech';
    bubble.textContent = phrases[index % phrases.length];
    bubble.addEventListener('animationend', () => bubble.remove(), { once: true });
    panel.append(bubble);
    panel.dataset.speechIndex = String(index + 1);
    panel.dataset.lastSpeech = String(score);
  }
  panel.dataset.lastScore = String(score);
  panel.dataset.level = response.level;
  panel.querySelector('.audience-mood').textContent = response.mood;
  panel.querySelector('.audience-progress').textContent = `${response.label}: ${Math.round(response.fraction * 100)}%`;
}

function renderOffers() {
  $('#offers').innerHTML = state.offers.map((id) => {
    const card = catalog.cards[id];
    const deck = deckOfCard(card);
    const properties = Object.entries(card.properties).map(([property, value]) => propertyBadge(property, value, card.reactivity)).join('');
    return `<button type="button" class="ingredient-card rarity-${card.rarity} ${selectedOffer === id ? 'selected' : ''}" data-offer="${escapeHtml(id)}" style="--ingredient:${deck.color};--deck-pale:${deck.pale}" aria-pressed="${selectedOffer === id}"><img class="card-art" src="assets/ingredients/${encodeURIComponent(card.imageId ?? card.id)}.png" alt="" loading="lazy"><span class="rarity">${keyword('Rarity')} ${escapeHtml(card.rarity)} · ${escapeHtml(deck.name)} · ${keyword('Type')} ${escapeHtml(card.type)}</span><h3>${escapeHtml(card.name)}</h3>${id === state.bossTurn.giftCardId ? '<span class="royal-request">Royal request · add for ×1.35 bowl</span>' : ''}<div class="stat-row"><span class="stat">${keyword('Power')} ${card.basePower}</span><span class="stat">${keyword('Volume')} ${card.volume} L</span><span class="stat">${keyword('React')} ×${card.reactivity}</span></div><div class="property-row">${properties}</div><p class="card-mechanic">${highlightKeywords(card.text)}</p><span class="card-detail keyword" data-tooltip="${escapeHtml(card.details ?? card.text)}">Full effect ⓘ</span>${heatSummary(card, plannedTemperature)}</button>`;
  }).join('');
  document.querySelectorAll('[data-offer]').forEach((button) => button.addEventListener('click', () => {
    if (busy) return;
    selectedOffer = button.dataset.offer;
    render();
  }));
}

function renderPot() {
  const pot = POTS.find((entry) => entry.id === state.potId);
  $('#deck-meters').innerHTML = activeDeckIds(state, catalog).filter((id) => id !== 'pantry').map((id) => {
    const deck = catalog.decks[id];
    const resource = id === 'culture' ? state.deckState.culture.resources.culture ?? 0 : id === 'hearth' ? state.deckState.hearth.resources.char ?? 0 : null;
    const name = id === 'culture' ? 'Culture' : id === 'hearth' ? 'Char' : 'Echo';
    const value = resource === null ? '75% / 125%' : `${resource}/6`;
    const hint = id === 'hearth' ? `${resource === 6 ? 'Full bank: the next furnace burn flares for 120+ points. ' : ''}90–105°C: build Char and boost Browning. 110°C+: spend 3+ Char for a Blaze. Cinder Bean spends Char on cool retention.`
      : id === 'chorus' ? 'Oldest active conductor chooses the opener. Silver Cream leads Infusion; Chime Fruit leads Browning (Preservation when cool); Crystal Citrus leads Extraction. Mushroom: Infusion → Browning. Marrow: Browning → Extraction.'
        : '40–60°C + Sugar: grow Culture. 90°C+ + Acid: harvest. Save 4+ for Seasoned Crock or all 6 for Sugar Glaze.';
    return `<div class="deck-meter" style="--deck-color:${deck.color};--deck-pale:${deck.pale}" id="resource-${id}"><span>${deck.symbol} ${name}</span><strong>${value}</strong></div><p class="engine-hint">${highlightKeywords(hint)}</p>`;
  }).join('');
  $('#pot-contents').innerHTML = state.contents.length ? state.contents.map((entry) => {
    const card = catalog.cards[entry.cardId];
    const deck = deckOfCard(card);
    const amount = card.id === BROTH_CARD_ID ? `${entry.volume.toFixed(2)} L · 0.25 Sugar / Acid / Aromatic / Protein / Mineral` : `${entry.presence.toFixed(2)} presence · ${occupiedVolume(entry, catalog).toFixed(2)} L`;
    const bar = card.id === BROTH_CARD_ID ? Math.max(8, entry.volume / pot.capacity * 100) : Math.min(100, entry.presence * 100);
    return `<button type="button" class="content-row replace-choice ${card.id === BROTH_CARD_ID ? 'broth-row' : ''} ${replacement === entry.instanceId ? 'chosen' : ''}" data-replace="${entry.instanceId}" data-instance="${entry.instanceId}" data-card-id="${escapeHtml(card.id)}" style="--deck-color:${deck.color}" aria-pressed="${replacement === entry.instanceId}" title="${card.id === BROTH_CARD_ID ? 'Broth contributes 0.25 of five properties, but no Fat. Select to pour it out when adding an offer.' : 'Select to replace this ingredient when adding the offer'}"><img class="row-icon" src="assets/ingredients/${encodeURIComponent(card.imageId ?? card.id)}.png" alt=""><span><strong>${escapeHtml(card.name)}</strong><small>${amount}${replacement === entry.instanceId ? ' · replace' : ''}</small></span><span class="content-bar"><span style="width:${bar}%;background:${deck.color}"></span></span></button>`;
  }).join('') : '<p class="empty">The pot is clean. Choose your first ingredient.</p>';
  document.querySelectorAll('[data-replace]').forEach((button) => button.addEventListener('click', () => {
    if (busy || !selectedOffer) return;
    replacement = replacement === button.dataset.replace ? null : button.dataset.replace;
    render();
  }));
  $('#residue-count').textContent = `${state.residues.length}/${POTS.find((pot) => pot.id === state.potId).residueSlots} slots`;
  potPhysics.sync(state.contents, catalog);
  $('#residues').innerHTML = state.residues.length ? state.residues.map((entry) => {
    const residue = catalog.residues[entry.id];
    const muted = state.disabledResidueIds.includes(entry.id);
    const complete = entry.tier >= residue.maxTier;
    return `<div class="residue-row ${muted ? 'silenced' : ''}" data-residue-installed="${entry.id}"><img class="residue-icon" src="assets/residues/${encodeURIComponent(residue.imageId ?? entry.id)}.png" alt=""><div><strong>${residue.symbol ?? ''} ${escapeHtml(residue.name)}</strong><small>${highlightKeywords(residue.text)}</small><p class="residue-objective">${muted ? 'Silenced this bowl · ' : ''}${complete ? 'Objective complete' : `${escapeHtml(residue.objective.text)} ${entry.progress ?? 0}/${residue.objective.target}`}</p><progress max="${residue.objective.target}" value="${complete ? residue.objective.target : entry.progress ?? 0}" aria-label="${escapeHtml(residue.name)} objective progress"></progress></div><span class="badge">level ${entry.tier}</span></div>`;
  }).join('') : '<p class="empty">Win an encounter to leave a mark in this run’s pot.</p>';
  $('#residues').querySelectorAll('[data-residue-installed]').forEach((row) => {
    const definition = catalog.residues[row.dataset.residueInstalled];
    const installed = state.residues.find((entry) => entry.id === definition.id);
    row.classList.add(`residue-${definition.rarity}`);
    row.querySelector('.badge').textContent = `${definition.rarity} · ${installed.tier}/${definition.maxTier}`;
  });
}

function renderReactions() {
  const projected = { ...state, temperature: plannedTemperature };
  $('#property-totals').innerHTML = ['sugar', 'protein', 'acid', 'mineral', 'fat', 'aromatic'].map((property) => `<span class="property-total term-${property}">${keyword(property)} <strong>${effectiveProperty(state, catalog, property).toFixed(2)}</strong></span>`).join('');
  let order = 0;
  $('#reactions').innerHTML = inspectReactions(projected, catalog).map((reaction) => `<div class="reaction-row ${reaction.active ? '' : 'inactive'}"><div><strong>${reaction.active ? `${++order}. ` : ''}${keyword(reaction.name)}</strong><small>${reaction.needs.map((need) => `${keyword(need)} ${reaction.inputs[need].toFixed(1)}`).join(' + ')} · ${reaction.min}–${reaction.max}°C${reaction.orderSource ? `<br>Conducted by ${escapeHtml(sourceLabel(reaction.orderSource))}` : ''}${reaction.multiplier > 1 ? `<br>Bonus ×${reaction.multiplier.toFixed(2)}: ${reaction.modifiers.map((modifier) => escapeHtml(sourceLabel(modifier.sourceId))).join(', ')}` : ''}</small></div><div>${reaction.active ? `<span class="reaction-strength">strength ${reaction.strength.toFixed(2)}</span>` : '<small>inactive</small>'}</div></div>`).join('');
}

function renderLedgerTotal() {
  $('#last-serving-total').textContent = state.lastBreakdown ? `${format(state.lastBreakdown.total)} pts this bowl` : 'No serving yet';
}

function sourceLabel(sourceId) {
  const deck = catalog.decks[deckIdOf(sourceId)] ?? catalog.decks.pantry;
  return deck?.presentation.labels[sourceId] ?? catalog.cards[sourceId]?.name ?? catalog.residues[sourceId]?.name ?? sourceId.split('.').at(-1).replaceAll('-', ' ');
}

function renderAction() {
  const requiredSize = getEncounter(state).boss?.requiredSize;
  if (requiredSize) plannedSize = requiredSize;
  const size = SERVING_SIZES.find((entry) => entry.id === plannedSize);
  $('#serving-sizes').innerHTML = SERVING_SIZES.map((entry) => `<button type="button" data-serving-size="${entry.id}" class="size-choice ${plannedSize === entry.id ? 'selected' : ''}" aria-pressed="${plannedSize === entry.id}" ${busy || state.phase !== 'serving' || (requiredSize && entry.id !== requiredSize) ? 'disabled' : ''}><strong>${entry.name} · ${entry.volume} L</strong><small>${entry.text}</small></button>`).join('');
  document.querySelectorAll('[data-serving-size]').forEach((button) => button.addEventListener('click', () => { plannedSize = button.dataset.servingSize; renderAction(); }));
  const card = selectedOffer && catalog.cards[selectedOffer];
  const action = card && state.phase === 'serving' ? { type: 'serve', offerId: card.id, disposition: 'add', temperature: plannedTemperature, servingSize: plannedSize, ...(replacement ? { replaceInstanceId: replacement } : {}) } : null;
  const projection = action ? preview(catalog, state, action) : null;
  const canAdd = !busy && state.phase === 'serving' && card && projection?.errors.length === 0;
  $('#serve-button').disabled = !canAdd;
  $('#serve-button').textContent = `Add + serve ${size.name.toLowerCase()}`;
  $('#discard-button').textContent = `Pass + serve ${size.name.toLowerCase()}`;
  $('#discard-button').disabled = busy || state.phase !== 'serving' || !card;
  $('#temperature-slider').disabled = busy || state.phase !== 'serving' || state.bossTurn.forcedHeat !== null;
  $('#selection-summary').innerHTML = card ? `<strong>${escapeHtml(card.name)}</strong> selected${replacement ? ` · replaces ${escapeHtml(catalog.cards[state.contents.find((entry) => entry.instanceId === replacement)?.cardId]?.name ?? 'ingredient')}` : ''}. ${projection?.errors.length ? 'Choose a pot ingredient to replace, or discard the offer.' : 'Choose add or discard.'}` : 'Choose an ingredient from the pantry.';
  const pulses = projection?.events.filter((event) => event.type === 'reactionPulse' && event.data.total > 0) ?? [];
  const discard = card && state.phase === 'serving' ? preview(catalog, state, { type: 'serve', offerId: card.id, disposition: 'discard', temperature: plannedTemperature, servingSize: plannedSize }) : null;
  const retained = (100 * (1 - size.volume / POTS.find((entry) => entry.id === state.potId).capacity)).toFixed(1);
  $('#preview-summary').textContent = projection?.errors.length ? `${projection.errors[0]}. Pass + serve: ${format(discard?.explanation?.total ?? 0)} pts.` : projection ? `Projected next serving: ${format(projection.explanation.total)} pts · ${size.name} · ${plannedTemperature}°C · ordinary retention ${retained}% · Pass instead: ${format(discard.explanation.total)} pts${pulses.length ? ` · ${pulses.map((event) => sourceLabel(event.sourceId)).join(' → ')}` : ''}` : `Choose an offer. ${size.name} keeps ${retained}% of ordinary ingredient presence; lower portions save volume and future reactions.`;
}

function renderStageReview() {
  const panel = $('#stage-review');
  panel.hidden = busy || state.phase === 'serving';
  if (panel.hidden) return;
  const prompt = { stock: 'Choose your starting stock', chapter: 'A new chapter awaits', reward: 'Chapter cleared — choose a new residue', won: 'Story complete', lost: 'The table wanted more' }[state.phase];
  panel.innerHTML = `<div><strong>${prompt}</strong><p>Your pot and last serving remain available to inspect.</p></div><button type="button" id="reopen-stage" class="quiet-button">${['stock', 'chapter'].includes(state.phase) ? 'Continue setup' : state.phase === 'reward' ? 'Choose residue' : 'View result / new run'}</button>`;
  $('#reopen-stage').addEventListener('click', showDialog);
}

function render() {
  if (!state) return;
  renderStatus();
  renderOffers();
  renderPot();
  renderReactions();
  renderLedgerTotal();
  renderAction();
  renderStageReview();
}

function renderEventLog(events, explanation) {
  const numbered = events.filter((event) => !['offersGenerated', 'turnPrepared', 'encounterWon', 'encounterLost', 'runWon'].includes(event.type));
  const details = explanation?.details ?? [];
  const detailById = new Map(details.map((detail) => [detail.instanceId, detail]));
  const precise = (number) => Number(number).toLocaleString(undefined, { maximumFractionDigits: 2 });
  $('#event-log').innerHTML = numbered.map((event, index) => {
    const deck = catalog.decks[deckIdOf(event.sourceId)] ?? catalog.decks.pantry;
    const parts = details.flatMap((detail) => detail.contributions.filter((part) => part.eventId === event.id && part.amount > 0).map((part) => ({ detail, part })));
    const modifiers = event.data.modifiers?.map((entry) => `${sourceLabel(entry.sourceId)} ×${Number(entry.factor).toFixed(2)}`) ?? [];
    const links = event.parentIds?.map((id) => numbered.find((earlier) => earlier.id === id)).filter(Boolean).map((parent) => sourceLabel(parent.sourceId)) ?? [];
    const notes = [
      event.data.orderSource ? `Conducted by ${sourceLabel(event.data.orderSource)}` : '',
      modifiers.length ? `Reaction bonus: ${modifiers.join(', ')}` : '',
      links.length ? `Copied from ${links.join(' + ')}` : '',
      event.type === 'presenceDepleted' ? `${detailById.get(event.targetIds[0])?.name ?? 'Ingredient'} presence ${precise(event.data.before)} → ${precise(event.data.after)}` : '',
      event.type === 'brothServed' ? `Broth ${precise(event.data.before)} → ${precise(event.data.after)} L` : '',
      event.type === 'residueProgress' ? `Objective ${event.data.after}/${event.data.target}` : ''
    ].filter(Boolean);
    const pointRows = parts.map(({ detail, part }) => {
      const factors = [
        detail.customer !== 1 ? `customer ×${precise(detail.customer)}` : '',
        detail.servingMultiplier !== 1 ? `bowl ×${precise(detail.servingMultiplier)}` : '',
        detail.demandMultiplier !== 1 ? `request ×${precise(detail.demandMultiplier)}` : ''
      ].filter(Boolean);
      const final = part.amount * detail.customer * detail.servingMultiplier * detail.demandMultiplier;
      return `<div class="ledger-part" data-point-awarded="${final}"><span>${escapeHtml(detail.name)} · ${part.kind === 'base' ? 'heat-adjusted base' : 'reaction'} ${precise(part.amount)}${factors.length ? ` · ${escapeHtml(factors.join(' · '))}` : ''}</span><b>+${precise(final)}</b></div>`;
    }).join('') + (event.type === 'residueBonusScored' ? `<div class="ledger-part" data-point-awarded="${event.data.amount}"><span>${escapeHtml(catalog.cards[event.data.cardId]?.name ?? 'Ingredient')} · level ${event.data.level} residue bonus</span><b>+${precise(event.data.amount)}</b></div>` : '');
    return `<div class="event-line pending" data-event-id="${event.id}" style="--deck-color:${deck.color}"><div class="event-head"><span><span class="event-number">#${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(describeEvent(event, catalog))}</strong></span><span class="event-phase">${escapeHtml(event.phase)}</span></div>${notes.length ? `<small class="event-context">${escapeHtml(notes.join(' · '))}</small>` : ''}${pointRows ? `<div class="ledger-parts">${pointRows}</div>` : ''}</div>`;
  }).join('') + (explanation ? '<p class="ledger-note">Point rows show base and reaction contributions after customer, bowl, and request multipliers. Simple residue bonuses appear as separate point rows. Display rounds to two decimals; the engine keeps full precision.</p>' : '');
}

function showChapterCard(recap = false) {
  const dialog = $('#level-dialog'), chapter = getEncounter(state), story = getStory(state);
  if (dialog.open) dialog.close();
  dialog.innerHTML = `<div class="chapter-card"><img class="chapter-art" src="assets/characters/${chapter.portrait}.png" alt="${escapeHtml(chapter.name)}"><div class="dialog-inner"><p class="eyebrow">${escapeHtml(story.name)} · Arc ${chapter.arc + 1} / ${story.arcs.length} · Chapter ${chapter.chapter} / ${story.chapters.length} ${chapter.boss ? '· BOSS' : ''}</p><h2>${escapeHtml(chapter.name)}</h2><p>${escapeHtml(chapter.narrative)}</p><p class="chapter-demand"><strong>${chapter.boss ? 'Demands' : 'Preferences'}</strong><br>${escapeHtml(bossDemandText(chapter))}<br>${escapeHtml(chapter.text)} · ${format(chapter.target)} points in ${chapter.servings} bowls.</p><div class="dialog-actions"><button id="chapter-close" type="button" class="quiet-button">${recap ? 'Back to cooking' : 'Inspect pot first'}</button>${recap ? '' : '<button id="chapter-begin" type="button" class="serve-button">Begin chapter</button>'}</div></div></div>`;
  const [pass, skilled, engine] = starThresholds(chapter);
  dialog.querySelector('.chapter-demand').insertAdjacentHTML('afterend', `<p class="chapter-stars">★ ${format(pass)} to pass · ★★ ${format(skilled)} and 1 reaction · ★★★ ${format(engine)} and 2 distinct scoring sources in one bowl</p>`);
  dialog.showModal();
  $('#chapter-close').addEventListener('click', () => dialog.close());
  $('#chapter-begin')?.addEventListener('click', () => commitSetup({ type: 'startChapter' }));
}

function commitSetup(action) {
  const result = step(catalog, state, action);
  if (result.errors.length) { $('#performance-label').textContent = result.errors.join(' '); return; }
  $('#level-dialog').close();
  state = result.state;
  selectedOffer = replacement = null;
  plannedTemperature = state.temperature;
  plannedSize = getEncounter(state).boss?.requiredSize ?? state.servingSize;
  render();
  showDialog();
}

function showDialog() {
  if (state.phase === 'serving') return;
  const dialog = $('#level-dialog');
  if (dialog.open) return;
  if (state.phase === 'chapter') { showChapterCard(); return; }
  if (state.phase === 'stock') {
    dialog.innerHTML = `<div class="dialog-inner"><p class="eyebrow">A clean pot, a small beginning</p><h2>Choose your starting stock</h2><p>One of three seeded choices. Each adds 0.6 L, 6 base Power and faint properties. Stock fades with serving; its last remnants become stronger Broth.</p><div class="dialog-options stock-options">${state.stockOffers.map((id) => {
      const stock = catalog.cards[id];
      return `<button class="dialog-option" type="button" data-stock="${id}"><img class="stock-art" src="assets/ingredients/${stock.imageId}.png" alt=""><strong>${escapeHtml(stock.name)}</strong><div class="property-row">${Object.entries(stock.properties).map(([property, value]) => propertyBadge(property, value, 1)).join('')}</div><small>0.6 L · Power 6 · React ×1<br>Cannot fuel a furnace.</small></button>`;
    }).join('')}</div></div>`;
    dialog.showModal();
    dialog.querySelectorAll('[data-stock]').forEach((button) => button.addEventListener('click', () => commitSetup({ type: 'chooseStock', stockId: button.dataset.stock })));
    return;
  }
  const encounter = getEncounter(state), target = encounterTarget(state);
  if (state.phase === 'reward') {
    const next = getStory(state).chapters[state.encounterIndex + 1];
    const choices = availableResidues(state, catalog);
    const pot = POTS.find((entry) => entry.id === state.potId);
    const full = state.residues.length >= pot.residueSlots;
    const replacementControl = full ? `<label class="residue-replacement">Replace this residue when installing a new one:<select id="residue-replacement">${state.residues.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(catalog.residues[entry.id].name)} · level ${entry.tier}</option>`).join('')}</select></label>` : '';
    dialog.innerHTML = `<div class="dialog-inner"><p class="eyebrow">Chapter cleared</p><h2>A new memory for the pot.</h2><p class="win">${format(state.score)} / ${format(target)} points.</p><p>${state.residues.length}/${pot.residueSlots} slots occupied. Choose a new residue; installed residues level by completing their objectives, not by picking them again. Progress lasts for this run.</p><p class="next-pressure"><strong>Next:</strong> ${escapeHtml(next.name)} ${next.boss ? '· BOSS' : ''} · ${format(next.target)} points</p>${replacementControl}<div class="dialog-options">${choices.map((residue) => `<button type="button" class="dialog-option" data-residue="${escapeHtml(residue.id)}"><img class="residue-icon" src="assets/residues/${encodeURIComponent(residue.imageId ?? residue.id)}.png" alt=""><strong>${residue.symbol ?? ''} ${escapeHtml(residue.name)}</strong><small>${highlightKeywords(residue.text)}</small><p class="residue-objective">Level 2: ${escapeHtml(residue.objective.text)}</p><small>${full ? 'Replace selected residue' : 'Install in empty slot'}</small></button>`).join('') || '<p>No new residues earned. Keep your pot and continue.</p>'}</div><div class="dialog-actions"><button type="button" class="quiet-button" id="inspect-run">Inspect pot and score</button><button type="button" class="quiet-button" id="keep-residue">Keep pot / continue</button></div></div>`;
    dialog.showModal();
    $('#inspect-run').addEventListener('click', inspectRun);
    dialog.querySelectorAll('[data-residue]').forEach((button) => button.addEventListener('click', () => chooseResidue(button.dataset.residue)));
    $('#keep-residue').addEventListener('click', () => chooseResidue(null));
  } else {
    const won = state.phase === 'won';
    const varietyMissing = !won && encounter.boss?.requiredTypes && state.encounterTypes.length < encounter.boss.requiredTypes;
    dialog.innerHTML = `<div class="dialog-inner"><p class="eyebrow">${won ? 'Story complete' : 'An unfinished story'}</p><h2>${won ? 'There is room for one more bowl.' : varietyMissing ? 'The bandits needed a wider supper.' : `${escapeHtml(encounter.name)} wanted more.`}</h2><p class="${won ? 'win' : 'loss'}">${format(state.score)} / ${format(target)} points${varietyMissing ? ` · ${state.encounterTypes.length}/${encounter.boss.requiredTypes} ingredient types` : ''}.</p><p>${won ? escapeHtml(getStory(state).ending) : 'The road will still be here. Inspect your pot and serving ledger before trying a different plan.'}</p><p>${format(state.totalScore)} total points · ${state.residues.length} residues. A new story starts with a clean pot.</p><div class="dialog-actions"><button type="button" class="quiet-button" id="inspect-run">Inspect pot and score</button><button type="button" class="serve-button" id="again">Start another story</button></div></div>`;
    dialog.showModal();
    $('#inspect-run').addEventListener('click', inspectRun);
    $('#again').addEventListener('click', () => { dialog.close(); showWelcome(); });
  }
  if (state.phase === 'reward' || state.phase === 'won') {
    const stars = state.lastEncounterStars;
    dialog.querySelector('.dialog-inner').insertAdjacentHTML('afterbegin', `<p class="chapter-resolution">${escapeHtml(encounter.resolution)}</p><p class="star-result" aria-label="${stars} stars earned">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · ${stars} star${stars === 1 ? '' : 's'}</p>`);
  }
  if (state.phase === 'won') {
    const stars = state.chapterResults.reduce((sum, result) => sum + result.stars, 0);
    dialog.querySelector('.star-result').insertAdjacentHTML('afterend', `<p class="run-stars">${stars}/${state.chapterResults.length * 3} story stars · ${state.chapterResults.map((result) => '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars)).join(' · ')}</p>`);
  }
  if (state.phase === 'reward') dialog.querySelectorAll('[data-residue]').forEach((button) => {
    const residue = catalog.residues[button.dataset.residue];
    button.classList.add(`residue-${residue.rarity}`);
    button.querySelector('strong').insertAdjacentHTML('afterend', `<small class="residue-rarity">${escapeHtml(residue.rarity)} · levels 1–${residue.maxTier}</small>`);
    button.querySelector('.residue-objective').textContent = `Repeat to level: ${residue.objective.text}`;
  });
}

function inspectRun() {
  $('#level-dialog').close();
  $('#serving-ledger').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function chooseResidue(residueId) {
  const pot = POTS.find((entry) => entry.id === state.potId);
  const needsReplacement = residueId && !state.residues.some((entry) => entry.id === residueId) && state.residues.length >= pot.residueSlots;
  const result = step(catalog, state, { type: 'chooseResidue', residueId, ...(needsReplacement ? { replaceResidueId: $('#residue-replacement')?.value } : {}) });
  if (result.errors.length) { $('#performance-label').textContent = result.errors[0]; return; }
  $('#level-dialog').close();
  state = result.state;
  selectedOffer = null;
  replacement = null;
  plannedTemperature = state.temperature;
  $('#performance-label').textContent = residueId ? `${catalog.residues[residueId].name} changes this run’s pot.` : 'Kept the current residue.';
  $('#event-log').innerHTML = '';
  render();
  showDialog();
}

async function serve(disposition) {
  if (busy || !selectedOffer) return;
  const baseline = state.score;
  const action = { type: 'serve', offerId: selectedOffer, disposition, temperature: plannedTemperature, servingSize: plannedSize, ...(disposition === 'add' && replacement ? { replaceInstanceId: replacement } : {}) };
  const result = step(catalog, state, action);
  if (result.errors.length) { $('#preview-summary').textContent = result.errors[0]; return; }
  state = result.state;
  selectedOffer = null;
  replacement = null;
  plannedTemperature = state.temperature;
  busy = true;
  render();
  potPhysics.sync(result.explanation.details.map((detail) => ({ instanceId: detail.instanceId, cardId: detail.cardId, presence: detail.presence, volume: state.contents.find((entry) => entry.instanceId === detail.instanceId)?.volume })), catalog);
  renderEventLog(result.events, result.explanation);
  await playEvents(result.events, { catalog, explanation: result.explanation, speed, soundEnabled, getSkip: () => skipEffects, labelElement: $('#performance-label'), layer: $('#fx-layer'), baseline, target: starThresholds(getEncounter(state))[2], onScore: renderAudience, onReaction: (event) => potPhysics.excite(event.data.participantIds ?? event.targetIds, Math.min(160, 70 + event.data.total * .2)) });
  busy = false;
  skipEffects = false;
  render();
  showDialog();
}

function showWelcome() {
  state = null;
  potPhysics.sync([], catalog);
  tooltips.hide();
  $('#game').hidden = true;
  $('#welcome').hidden = false;
  $('#level-dialog').close?.();
  renderWelcome();
}

$('#temperature-slider').addEventListener('input', (event) => { if (!busy && state?.phase === 'serving') { plannedTemperature = Number(event.target.value); render(); } });
$('#serve-button').addEventListener('click', () => serve('add'));
$('#discard-button').addEventListener('click', () => serve('discard'));
$('#new-game').addEventListener('click', () => { if (!busy) showWelcome(); });
$('#start-story').addEventListener('click', startGame);
$('#skip-effects').addEventListener('click', () => { skipEffects = true; });
$('#speed-toggle').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; $('#speed-toggle').textContent = speed === 1 ? '2× speed' : '1× speed'; });
$('#sound-toggle').addEventListener('click', () => { soundEnabled = !soundEnabled; $('#sound-toggle').textContent = soundEnabled ? 'Sound on' : 'Sound off'; $('#sound-toggle').setAttribute('aria-pressed', String(soundEnabled)); });

try {
  catalog = await loadCatalog();
  $('#glossary-content').innerHTML = glossaryHtml();
  renderWelcome();
} catch (error) {
  $('#welcome').innerHTML = `<div class="welcome-copy"><h2>Could not load the deck packages.</h2><p>${escapeHtml(error.message)}</p><p>Run <code>npm.cmd run dev</code> in this project and open the local address shown.</p></div>`;
}
