export const labels = { 'core.browning': 'Browning', 'core.infusion': 'Infusion', 'core.extraction': 'Extraction', 'core.preservation': 'Preservation' };
export const accents = { pulse: '#cf8a38', resource: '#cf8a38', cost: '#9b6652' };
export const motion = { shape: 'spark' };
export const cardDescriptions = {
  'pantry.beef': 'Protein pairs with Sugar for Browning at 70–110°C. At 90°C+, a Hearth furnace can spend Beef’s presence to make 1 Char, normally costing 0.20 before scoring; Banked Embers can lower that cost.',
  'pantry.onion': 'Sugar pairs with Protein for Browning at 70–110°C or Acid for Preservation at 0–60°C. Aromatic 2 pairs with Fat for Infusion at 40–100°C.',
  'pantry.butter': 'Fat 2 pairs with Aromatic for Infusion at 40–100°C. An Aromatic partner such as Moon Onion lets both ingredients gain reaction points.',
  'pantry.lemon': 'Acid 2 pairs with Mineral for Extraction at 50–120°C; its own Sugar enables Preservation at 0–60°C. At 90°C+, Acid can harvest stored Culture even though Lemon’s hot base score is weak.',
  'pantry.oyster': 'Mineral 2 pairs with Acid for Extraction at 50–120°C. Protein also pairs with Sugar for Browning at 70–110°C, or fuels a Hearth furnace at 90°C+, normally costing 0.20 presence.',
  'pantry.salt': 'Only 10 base power, but Mineral 1 with React ×3 contributes 3 effective Mineral while fully present. Pair it with Acid for Extraction at 50–120°C; its contribution fades with presence.'
};
export function eventText(event) {
  if (event.type === 'reactionPulse') return `✦ ${labels[event.sourceId] ?? 'Pantry reaction'} +${event.data.total.toFixed(1)}`;
  return null;
}
