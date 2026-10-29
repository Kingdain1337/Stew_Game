export const labels = { 'culture.harvest': 'Culture harvest', 'culture.seasoned-crock': 'Seasoned Crock', 'culture.sugar-glaze': 'Sugar Glaze' };
export const accents = { pulse: '#82bc87', resource: '#9bca9f', cost: '#c49766' };
export const motion = { shape: 'bubble' };
export const cardDetails = {
  'culture.mother': 'At 40–60°C, with at least 1 effective Sugar, the oldest live Culture source grows 1 Culture per serving (cap 6). Bubble Fig adds 1; Sugar Glaze adds its tier every growth. Build the bank, then harvest with Acid at 90°C+.',
  'culture.yeast': 'A second Culture source: at 40–60°C and effective Sugar ≥1, it grows a base 1 Culture only if it is the oldest live source. Multiple sources do not stack; Bubble Fig or Sugar Glaze can boost growth before a 90°C+ Acid harvest.',
  'culture.peel': 'Sugar 2 can feed Culture growth at 40–60°C. Acid 1 can harvest it at 90°C+, but this card loses base heat value as the pot gets hotter. Its Sugar also pairs with Protein for Browning or Acid for Preservation.',
  'culture.plum': 'Sugar 1 feeds Culture at 40–60°C; Acid 2 harvests at 90°C+. Harvest strength uses at most 3 effective Acid. Spending 4+ Culture activates Seasoned Crock; spending all 6 activates Sugar Glaze’s large harvest multiplier.',
  'culture.candycap': 'Sugar 2 feeds cool Culture growth; Aromatic pairs with Fat for Infusion at 40–100°C. Candycap has no Acid, so it cannot trigger a Culture harvest on its own.',
  'culture.cream': 'At 40–60°C, the oldest live Culture source retains at least 98% / 96% / 93% after a small / standard / large serving, allowing it to survive a long setup. Fat 1 also pairs with Aromatic for Infusion at 40–100°C; protection stops outside the cool band.',
  'culture.ember': 'High immediate score at 90–110°C helps when there is no time to build Culture. Its Sugar 1 can still feed growth at 40–60°C, but its own base score is poor at cool heat.',
  'culture.fig': 'At 40–60°C, if a live Culture source and Sugar ≥1 already allow growth, Bubble Fig adds 1 extra Culture (maximum 6). Copies do not stack; without a source it gives no growth.'
};
export const cardDescriptions = {
  'culture.mother': "The oldest live source grows 1 Culture when its sweet food is warm.",
  'culture.yeast': "An alternative Culture source. Only the oldest live source grows each bowl.",
  'culture.peel': "Sweetness for cool growth and Acid for a hot harvest; it scores best cool.",
  'culture.plum': "Sugar grows Culture; its strong Acid makes a hot harvest valuable.",
  'culture.candycap': "A sweet, fragrant growth partner without harvest Acid.",
  'culture.cream': "Protects the oldest Culture source from serving loss while warm.",
  'culture.ember': "Strong immediate score when hot; weak during a cool Culture setup.",
  'culture.fig': "Adds 1 extra Culture when a live source can already grow."
};
export function eventText(event) {
  if (event.type === 'reactionPulse' && event.sourceId === 'culture.harvest') return `◌ Culture blooms +${event.data.total.toFixed(1)}`;
  if (event.type === 'resourceChanged' && event.data.resource === 'culture') return `◌ Culture ${event.data.delta > 0 ? '+' : ''}${event.data.delta}`;
  return null;
}
