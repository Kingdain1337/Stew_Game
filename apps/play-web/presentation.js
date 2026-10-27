const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const format = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
const REACTION_COLORS = {
  'core.browning': '#e9a33a', 'core.infusion': '#48a471',
  'core.extraction': '#58a8ca', 'core.preservation': '#d368aa'
};

function deckForEvent(event, catalog) { return catalog.decks[event.sourceId?.split('.')[0]] ?? catalog.decks.pantry; }
function cardNameForSource(sourceId, catalog) {
  const deck = catalog.decks[sourceId?.split('.')[0]];
  return deck?.presentation.labels[sourceId] ?? catalog.cards[sourceId]?.name ?? catalog.residues?.[sourceId]?.name ?? sourceId?.split('.').at(-1).replaceAll('-', ' ') ?? 'The pot';
}

export function describeEvent(event, catalog) {
  const deck = deckForEvent(event, catalog);
  const specialized = deck.presentation.eventText(event);
  if (specialized) return specialized;
  if (event.type === 'ingredientAdded') return `+ ${event.data.name} joins the pot`;
  if (event.type === 'ingredientRemoved') return `${event.data.name} leaves the pot`;
  if (event.type === 'ingredientDissolved') return `${event.data.name} dissolves into Broth (+${event.data.volume.toFixed(2)} L)`;
  if (event.type === 'brothEnriched') return `Broth gathers ${event.data.added.toFixed(2)} L of remnants`;
  if (event.type === 'presenceConsumed') return `${cardNameForSource(event.sourceId, catalog)} spends ${event.data.amount.toFixed(2)} presence`;
  if (event.type === 'retentionRequested') return `${cardNameForSource(event.sourceId, catalog)} protects an ingredient (×${event.data.fraction.toFixed(2)} retained)`;
  if (event.type === 'residueLeveled') return `${catalog.residues[event.sourceId]?.name ?? event.sourceId} reached level 2 — objective completed!`;
  if (event.type === 'servingSizeChosen') return `${event.data.name} bowl · ${event.data.volume} L serving fraction · ×${event.data.multiplier} base portion multiplier`;
  if (event.type === 'resourceChanged') return `${cardNameForSource(event.sourceId, catalog)}: ${event.data.resource} ${event.data.delta > 0 ? '+' : ''}${event.data.delta}`;
  if (event.type === 'baseScored') return `${cardNameForSource(event.sourceId, catalog)} adds its base score`;
  if (event.type === 'reactionPulse') return `${cardNameForSource(event.sourceId, catalog)} ${event.data.origin === 'derived' ? 'echoes' : 'reacts'} for +${event.data.total.toFixed(1)}`;
  if (event.type === 'scoreCalculated') return `Serving scores ${event.data.total.toFixed(1)} points`;
  return event.type.replace(/([A-Z])/g, ' $1').toLowerCase();
}

let audioContext;
function playNote(deckId, type, enabled) {
  if (!enabled || !('AudioContext' in window)) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  const root = { pantry: 330, culture: 392, hearth: 220, chorus: 523 }[deckId] ?? 330;
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = deckId === 'hearth' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(type === 'reactionPulse' ? root * 1.5 : root, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(root, audioContext.currentTime + .16);
  volume.gain.setValueAtTime(.0001, audioContext.currentTime);
  volume.gain.exponentialRampToValueAtTime(.035, audioContext.currentTime + .012);
  volume.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .18);
  oscillator.connect(volume).connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime + .19);
}

function pointFor(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
function iconFor(id) { return [...document.querySelectorAll('#pot-interior [data-instance]')].find((element) => element.dataset.instance === id); }
function sourceIcon(event) { return [...document.querySelectorAll('#pot-interior [data-card-id]')].find((element) => element.dataset.cardId === event.sourceId); }
function participants(event) {
  const ids = [...new Set([...(event.data.participantIds ?? event.targetIds ?? [])])];
  const icons = ids.map(iconFor).filter(Boolean);
  const source = sourceIcon(event);
  if (source && !icons.includes(source)) icons.unshift(source);
  return icons;
}
function pulseColor(event, deck) { return REACTION_COLORS[event.sourceId] ?? deck.presentation.accents?.pulse ?? deck.color; }

function scoreParts(event, explanation) {
  return explanation.details.flatMap((detail) => detail.contributions
    .filter((part) => part.eventId === event.id && part.amount > 0)
    .map((part) => ({ instanceId: detail.instanceId, amount: part.amount * detail.customer * detail.residueMultiplier * (detail.servingMultiplier ?? 1) * (detail.demandMultiplier ?? 1) })));
}

function setScore(value, target, color) {
  const number = document.querySelector('#total-score');
  const meter = document.querySelector('#score-meter');
  const card = document.querySelector('.score-card');
  number.textContent = format(value);
  meter.style.width = `${Math.min(100, 100 * value / target)}%`;
  if (color) {
    card.style.setProperty('--reaction-color', color);
    card.animate([
      { transform: 'translateX(0)', boxShadow: '0 0 0 transparent' },
      { transform: 'translateX(-4px)', boxShadow: `0 0 28px ${color}`, offset: .25 },
      { transform: 'translateX(4px)', boxShadow: `0 0 28px ${color}`, offset: .55 },
      { transform: 'translateX(0)', boxShadow: '0 0 0 transparent' }
    ], { duration: 320, easing: 'ease-out' });
    number.animate([{ color }, { color: 'inherit' }], { duration: 500 });
    meter.animate([{ background: color }, { background: color }], { duration: 500 });
  }
}

async function drawReaction(event, layer, color, duration) {
  const icons = participants(event);
  const source = sourceIcon(event) ?? icons[0] ?? document.querySelector('#pot-visual');
  const from = pointFor(source);
  const destinations = icons.filter((icon) => icon !== source);
  const lines = destinations;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'reaction-lines');
  svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
  svg.style.setProperty('--reaction-color', color);
  const connections = [];
  for (const icon of lines) {
    const to = pointFor(icon);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x); line.setAttribute('y2', to.y);
    svg.append(line);
    connections.push({ icon, line });
  }
  let circle;
  if (!lines.length) {
    circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', from.x); circle.setAttribute('cy', from.y); circle.setAttribute('r', 26);
    svg.append(circle);
  }
  layer.append(svg);
  let tracking = true;
  function track() {
    if (!tracking) return;
    const origin = pointFor(source);
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    for (const { icon, line } of connections) {
      const destination = pointFor(icon);
      line.setAttribute('x1', origin.x); line.setAttribute('y1', origin.y);
      line.setAttribute('x2', destination.x); line.setAttribute('y2', destination.y);
    }
    if (circle) { circle.setAttribute('cx', origin.x); circle.setAttribute('cy', origin.y); }
    requestAnimationFrame(track);
  }
  requestAnimationFrame(track);
  for (const icon of icons) {
    icon.style.setProperty('--reaction-color', color);
    icon.classList.add('reaction-lit');
    icon.animate([{ filter: `drop-shadow(0 0 0 ${color})` }, { filter: `drop-shadow(0 0 16px ${color}) brightness(1.8)` }, { filter: `drop-shadow(0 0 0 ${color})` }], { duration, easing: 'ease-in-out' });
  }
  try { await sleep(duration); } finally {
    tracking = false;
    svg.remove();
    icons.forEach((icon) => icon.classList.remove('reaction-lit'));
  }
}

async function floatPoints(layer, origin, amount, color, duration, onAppear) {
  const start = pointFor(origin ?? document.querySelector('#pot-visual'));
  const token = document.createElement('span');
  token.className = 'score-bubble';
  token.textContent = `+${format(amount)}`;
  token.style.left = `${start.x}px`;
  token.style.top = `${start.y}px`;
  token.style.setProperty('--reaction-color', color);
  layer.append(token);
  let shown = false;
  const timer = setTimeout(() => { shown = true; onAppear(); }, duration * .33);
  try {
    await token.animate([
      { transform: 'translate(-50%, 0) scale(.55)', opacity: 0 },
      { transform: 'translate(-50%, -28px) scale(1.14)', opacity: 1, offset: .3 },
      { transform: 'translate(calc(-50% + 16px), -105px) scale(.92)', opacity: 0 }
    ], { duration, easing: 'ease-out', fill: 'forwards' }).finished;
  } finally {
    clearTimeout(timer);
    if (!shown) onAppear();
    token.remove();
  }
}

export async function playEvents(events, { catalog, explanation, speed, soundEnabled, getSkip, labelElement, layer, baseline, target, onReaction = () => {}, onScore = () => {} }) {
  const salient = events.filter((event) => ['servingSizeChosen', 'ingredientAdded', 'ingredientRemoved', 'ingredientDissolved', 'brothEnriched', 'presenceConsumed', 'resourceChanged', 'retentionRequested', 'baseScored', 'reactionPulse', 'scoreCalculated', 'residueLeveled'].includes(event.type));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let displayed = baseline;
  setScore(displayed, target);
  onScore(displayed);
  for (const event of salient) {
    if (getSkip()) break;
    labelElement.textContent = describeEvent(event, catalog);
    const logLine = [...document.querySelectorAll('#event-log [data-event-id]')].find((line) => line.dataset.eventId === event.id);
    logLine?.classList.remove('pending');
    logLine?.classList.add('current');
    if (logLine) {
      const log = document.querySelector('#event-log');
      log.scrollTop += logLine.getBoundingClientRect().top - log.getBoundingClientRect().top - 20;
    }
    const deck = deckForEvent(event, catalog);
    const color = event.type === 'baseScored' ? '#d18a38' : pulseColor(event, deck);
    const parts = scoreParts(event, explanation);
    if (event.type === 'reactionPulse') {
      onReaction(event);
      playNote(deck.id, event.type, soundEnabled);
      if (!reducedMotion) await drawReaction(event, layer, color, Math.round(430 / speed));
    }
    if (parts.length) {
      for (const part of parts) {
        const increment = () => { displayed += part.amount; setScore(displayed, target, color); onScore(displayed); };
        if (reducedMotion || getSkip()) increment();
        else await floatPoints(layer, iconFor(part.instanceId), part.amount, color, Math.round(560 / speed), increment);
      }
    } else if (!reducedMotion && event.type !== 'scoreCalculated') await sleep(Math.round(75 / speed));
    logLine?.classList.remove('current');
  }
  document.querySelectorAll('#event-log .pending').forEach((line) => line.classList.remove('pending'));
  setScore(baseline + explanation.total, target);
  onScore(baseline + explanation.total);
  const final = salient.findLast((event) => event.type === 'scoreCalculated');
  if (final) labelElement.textContent = `Serving complete · ${describeEvent(final, catalog)}`;
}
