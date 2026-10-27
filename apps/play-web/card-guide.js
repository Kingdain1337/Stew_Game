import { temperatureMultiplier } from '../../packages/game-core/index.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export const GLOSSARY = {
  'Serving size': 'Choose small (0.2 L, ×0.65 points), standard (0.4 L, ×1), or large (0.7 L, ×1.5). The multiplier applies to the whole bowl, including reactions and deck pulses. Ordinary retained presence = 1 − serving litres ÷ pot capacity. These are serving fractions, not a fixed amount removed from a partially filled pot. Bosses can require a size.',
  Stock: 'Choose one of three seeded random stocks before chapter one. A stock occupies 0.6 L, has 6 base Power and two properties weaker than Broth. It decays like an ingredient and joins Broth below 0.15 presence. It cannot be drafted later or burned as furnace fuel.',
  Objective: 'Each installed residue has a secondary goal and progress counter. Only actions after installation count. Completion upgrades it to level 2 after scoring, affecting the next bowl. Progress survives chapters; a temporarily silenced residue gains no progress that bowl.',
  Operational: 'At least 0.25 presence. Deck sources, conductors, keepers, and special payoff ingredients stop triggering below this threshold, though base score and ordinary properties still work until the ingredient becomes broth.',
  Conductor: 'An operational Bellglass ingredient that moves one common reaction forward. Older conductors take priority, then remaining reactions use their normal order. Inactive reactions do not score. Harvest and other deck originals resolve after common chemistry.',
  Harmony: 'Quiet Mushroom rewards Infusion scoring before Browning in the same serving: copy Browning at 100% × Mushroom presence. Reverse order gives no Harmony. Requires both positive reactions and at least 0.25 Mushroom presence; copies cannot echo.',
  Crescendo: 'Resonant Marrow rewards Browning scoring before Extraction: copy Extraction at 100% × Marrow presence. Reverse order gives no Crescendo. Requires both positive reactions and at least 0.25 Marrow presence; copies cannot echo.',
  Overflow: 'At 90°C+, if Char is already 6 before a furnace burns eligible Protein, score a 120-point original flare instead of wasting the gain. Smoke Pear multiplies it by 1.5; Banked Embers adds another ×1.75 / ×2.5 at level 1 / 2. The bank remains 6 until spent.',
  Blaze: 'At 110°C+, after the furnace burn, automatically spend the entire bank of 3–6 Char for 60 points per Char, or 80 with operational Ember Truffle. Full-six Blazes gain ×1.5 / ×2 at Coal Keeper level 1 / 2. Requires an operational non-broth ingredient; does not require Dumplings or a furnace.',
  Power: 'Base points before heat, reactions, and customer effects. Actual base score is Power × remaining presence ÷ pot capacity × heat multiplier.',
  Volume: 'Litres occupied now = listed card volume × remaining presence. Serving lowers presence and frees volume. The faint remainder below 0.15 presence becomes broth instead of vanishing.',
  React: 'Reactivity. Multiply each printed property by React and remaining presence to get its effective amount. React does not multiply base Power directly.',
  Presence: 'How much of this ingredient remains. It multiplies score, property strength, and occupied volume. New ingredients start at 1; ordinary retention is 1 − serving litres ÷ capacity. Small / standard / large use 0.2 / 0.4 / 0.7 L: Iron keeps 93.3% / 86.7% / 76.7%, Royal 96% / 92% / 86%. Serving points multiply by 0.65 / 1 / 1.5. Below 0.15 after serving, the remnant joins broth.',
  Heat: 'Heat changes base score using the listed multiplier knots; values between knots are interpolated. Ability and reaction temperature ranges are separate, exact cutoffs.',
  Protein: 'Property for Browning with Sugar at 70–110°C. A Hearth furnace can consume Protein presence at 90°C+ to make Char.',
  Sugar: 'Property for Browning with Protein at 70–110°C and Preservation with Acid at 0–60°C. Effective Sugar ≥1 feeds Culture growth at 40–60°C.',
  Fat: 'Property for Infusion with Aromatic at 40–100°C.',
  Aromatic: 'Property for Infusion with Fat at 40–100°C.',
  Acid: 'Property for Extraction with Mineral at 50–120°C and Preservation with Sugar at 0–60°C. At 90°C+, it harvests stored Culture; effective Acid is capped at 3 for harvest strength.',
  Mineral: 'Property for Extraction with Acid at 50–120°C.',
  Browning: 'Protein + Sugar, active at 70–110°C. Reaction strength is the smaller effective property amount. It adds points to ingredients carrying either property.',
  Infusion: 'Fat + Aromatic, active at 40–100°C. It adds points to ingredients carrying those properties.',
  Extraction: 'Acid + Mineral, active at 50–120°C. It adds points to Mineral-bearing ingredients. Acid presence is depleted a little faster after this reaction.',
  Preservation: 'Acid + Sugar, active at 0–60°C. It adds points to ingredients carrying either property.',
  Culture: 'A run-persistent resource, maximum 6. Grow it at 40–60°C with a live source and effective Sugar ≥1; at 90°C+ with Acid, spend it for a harvest pulse.',
  Char: 'A run-persistent resource, maximum 6. At 90°C+, a furnace can burn Protein presence for Char. With a live furnace, each banked Char adds 20% to Browning. At 6, further burns create Overflow points; at 110°C+, spend 3+ Char on a Blaze. Dumplings and cool retention are additional outlets.',
  Echo: 'Glass Noodle copies 125% and Bell Herb 75% of the first positive echoable original pulse, costing 0.10 presence. Conductors reorder common chemistry. If no common reaction scores, a later deck pulse such as Harvest can be copied. Copied pulses do not themselves trigger another echo.',
  Rarity: 'Offer frequency outside the guaranteed opening offer: Common weight 5, Uncommon 3, Rare 1. Rarity does not directly alter score.',
  Type: 'A card category used by some customers to raise or lower this ingredient’s final score. It is separate from its reaction properties.',
  Residue: 'A reward earned after an encounter from ingredients that contributed points. Iron has seven slots; Royal has five. Choose new residues after chapters. Each has a visible secondary objective; complete it to reach level 2 automatically, effective next bowl. No repeat-pick upgrades. A witch can silence both effect and objective progress for a bowl. Everything resets with the run.',
  Reaction: 'A point bonus from properties meeting a listed temperature range. Effective property = printed amount × React × presence; the weaker required property sets strength.',
  Effective: 'The amount that actually counts toward a property check: printed property × React × remaining presence, summed across the pot. Acid 2 at React ×1.2 and presence 1 counts as 2.4 effective Acid.',
  Harvest: 'At 90°C+ with effective Acid above zero, Culture spends all stored Culture to make an original point pulse: 30 × Culture spent × min(effective Acid, 3).',
  Furnace: 'A live Smokeleaf or Soot Pepper. At 90°C+, the oldest furnace can spend 0.20 presence from the oldest eligible Protein ingredient to make 1 Char, or a 120-point Overflow if already at 6. Requires at least 0.25 presence on furnace and fuel.',
  Retention: 'A request to keep at least a stated fraction of an ingredient after serving. Printed protection assumes a standard bowl; its remaining loss scales with serving size (half for small, ×1.75 for large). The strongest request wins over ordinary depletion; pre-score costs still apply.',
  Original: 'A reaction pulse produced by common chemistry or a deck before echoes. Chorus can copy the first positive eligible original pulse; copied pulses are derived and cannot echo again.',
  Customer: 'The current encounter. Its listed preference multiplies each relevant ingredient’s final score after reactions.',
  Tier: 'The strength level of an installed residue. New residues start at level 1. Complete the listed objective after installation to reach level 2. Progress carries between chapters; repeating reward picks cannot upgrade it.',
  Broth: 'A single shared pot remnant. When an ingredient falls below 0.15 presence after serving, its remaining volume joins broth. While any broth remains, it contributes 0.25 Sugar, Acid, Aromatic, Protein, and Mineral—but no Fat. Broth also has 18 base Power at 0.6 L or more, proportionally less below 0.6 L. Serving reduces broth volume too.'
};

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const TERM_PATTERN = new RegExp(`\\b(${TERMS.join('|')})\\b`, 'gi');
const PROPERTY_COLORS = new Set(['Protein', 'Sugar', 'Fat', 'Aromatic', 'Acid', 'Mineral']);

function termClass(term) {
  const key = TERMS.find((entry) => entry.toLowerCase() === term.toLowerCase());
  if (['Overflow', 'Blaze', 'Furnace'].includes(key)) return 'term-char';
  if (['Conductor', 'Harmony', 'Crescendo'].includes(key)) return 'term-echo';
  return PROPERTY_COLORS.has(key) ? `term-${key.toLowerCase()}` : ['Culture', 'Char', 'Echo'].includes(key) ? `term-${key.toLowerCase()}` : 'term-rule';
}

export function keyword(term, extra = '') {
  const key = TERMS.find((entry) => entry.toLowerCase() === term.toLowerCase());
  if (!key) return escapeHtml(term);
  const definition = GLOSSARY[key];
  return `<span class="keyword ${termClass(key)} ${extra}" data-tooltip="${escapeHtml(definition)}">${escapeHtml(term)}</span>`;
}

export function highlightKeywords(copy) {
  let html = '';
  let cursor = 0;
  for (const match of copy.matchAll(TERM_PATTERN)) {
    html += escapeHtml(copy.slice(cursor, match.index)) + keyword(match[0]);
    cursor = match.index + match[0].length;
  }
  return html + escapeHtml(copy.slice(cursor));
}

export function propertyBadge(property, value, reactivity) {
  const name = property[0].toUpperCase() + property.slice(1);
  const definition = `${GLOSSARY[name]} Printed ${name} ${value} × React ${reactivity} × presence 1 = ${(value * reactivity).toFixed(2)} effective ${name} now; it falls as the ingredient is served.`;
  return `<span class="property-badge term-${property}" data-tooltip="${escapeHtml(definition)}">${name} ${value}</span>`;
}

export function heatSummary(card, currentHeat) {
  const current = temperatureMultiplier(card, currentHeat);
  const knots = card.temperature.map(([temperature, factor]) => `<span>${temperature}° ×${factor.toFixed(2)}</span>`).join('');
  return `<div class="heat-profile"><strong>${keyword('Heat')} score</strong><span>At ${currentHeat}°C: ×${current.toFixed(2)} base</span><div class="heat-knots" title="Multipliers between these temperatures are interpolated; exact ability cutoffs are in the description.">${knots}</div></div>`;
}

export function glossaryHtml() {
  const groups = [
    ['Card stats', ['Serving size', 'Stock', 'Objective', 'Power', 'Volume', 'React', 'Presence', 'Broth', 'Heat', 'Rarity', 'Type', 'Residue', 'Tier', 'Customer']],
    ['Properties', ['Protein', 'Sugar', 'Fat', 'Aromatic', 'Acid', 'Mineral']],
    ['Reactions and deck engines', ['Operational', 'Conductor', 'Harmony', 'Crescendo', 'Overflow', 'Blaze', 'Effective', 'Reaction', 'Browning', 'Infusion', 'Extraction', 'Preservation', 'Culture', 'Harvest', 'Char', 'Furnace', 'Retention', 'Echo', 'Original']]
  ];
  return groups.map(([heading, keys]) => `<section><h3>${heading}</h3><dl>${keys.map((key) => `<div><dt>${keyword(key)}</dt><dd>${escapeHtml(GLOSSARY[key])}</dd></div>`).join('')}</dl></section>`).join('');
}
