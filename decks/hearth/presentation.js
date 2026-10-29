export const labels = { 'hearth.char-payoff': 'Char-fed Dumpling', 'hearth.overflow': 'Overflow flare', 'hearth.blaze': 'Blaze cash-out', 'hearth.banked-embers': 'Banked Embers', 'hearth.coal-keeper': 'Coal Keeper' };
export const accents = { pulse: '#f07643', resource: '#ed9f5d', cost: '#b3422a' };
export const motion = { shape: 'spark' };
export const cardDetails = {
  'hearth.smokeleaf': "Oldest furnace burns 0.20 of the oldest eligible Protein presence at 90°C+ to gain 1 Char. Banked Char multiplies Browning by 1 + 0.20 × Char. At 6 Char, further burns flare for 120 points instead. At 110°C+, spend 3–6 Char on a Blaze worth 60 points per Char.",
  'hearth.soot-pepper': "Alternative furnace: at 90°C+, burn 0.20 Protein presence for 1 Char, or a 120-point Overflow at the cap of 6. Only the oldest furnace burns. Banked Char strengthens Browning; 110°C+ cashes out 3+ Char in a Blaze. Aromatic pairs with Fat for Infusion at 40–100°C.",
  'hearth.marrow': "Protein feeds the oldest furnace at 90°C+, losing 0.20 presence before scoring (less with Banked Embers). Pair with Sugar for Browning at 70–110°C: each banked Char adds 20% to that reaction while a live furnace remains.",
  'hearth.bean': "Protein and Sugar can activate Browning at 70–110°C without another ingredient. A furnace can burn this Bean to build Char, which strengthens Browning, but the presence cost reduces both of this card’s properties.",
  'hearth.dumpling': "The oldest Dumpling scores 25 × banked Char × its presence every serving, at any heat. This does not spend Char. A 110°C+ Blaze spends the bank first, so keep heat at 105°C or lower to keep earning the stored-Char bonus.",
  'hearth.cinder-bean': "At 40–60°C, spend 1 Char to retain 98% / 96% / 93% presence with a small / standard / large serving on both the oldest other furnace and the oldest other Protein ingredient. Protects up to two distinct ingredients, even in the 3 L pot; does nothing if neither target exists.",
  'hearth.truffle': "While operational, a Blaze at 110°C+ scores 80 per Char instead of 60; copies do not stack. A Blaze needs at least 3 Char and spends the whole bank after this turn’s furnace burn. Aromatic also supports Infusion, which stops above 100°C.",
  'hearth.pear': "While operational, Overflow flares score ×1.5: 180 points before residue bonuses. At 90°C+, Overflow requires a live furnace, eligible Protein and a bank already at 6 Char before burning. Sugar supports Browning; Aromatic supports Infusion."
};
export const cardDescriptions = {
  'hearth.smokeleaf': "The oldest furnace burns Protein to make Char; a full bank flares instead.",
  'hearth.soot-pepper': "An Aromatic furnace that burns Protein for Char or a full-bank flare.",
  'hearth.marrow': "A Protein source a furnace can spend to build Char.",
  'hearth.bean': "A self-contained sweet Protein fuel. Burning it weakens both properties.",
  'hearth.dumpling': "The oldest Dumpling scores 25 points per banked Char without spending it.",
  'hearth.cinder-bean': "Spends 1 Char while warm to protect a furnace and a Protein ingredient.",
  'hearth.truffle': "While live, raises Blaze from 60 to 80 points per spent Char.",
  'hearth.pear': "While live, multiplies Overflow flare points by ×1.5."
};
export function eventText(event) {
  if (event.type === 'reactionPulse' && event.sourceId === 'hearth.char-payoff') return `✹ Embers feed the pot +${event.data.total.toFixed(1)}`;
  if (event.type === 'resourceChanged' && event.data.resource === 'char') return `✹ Char ${event.data.delta > 0 ? '+' : ''}${event.data.delta}`;
  return null;
}
