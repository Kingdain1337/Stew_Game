export const labels = { 'chorus.tuned-rim': 'Tuned Rim', 'chorus.silver-note': 'Silver Note', 'chorus.harmony': 'Harmony: Infusion → Browning', 'chorus.crescendo': 'Crescendo: Browning → Extraction' };
export const accents = { pulse: '#aa8ce2', resource: '#bba6eb', cost: '#726086' };
export const motion = { shape: 'ring' };
export const cardDescriptions = {
  'chorus.glass-noodle': "At any heat, copies 125% of the first positive, echoable original reaction onto its scored ingredients. Costs 0.10 presence each serving (0.08 / 0.05 at Tuned Rim level 1 / 2). Takes priority over Bell Herb. Derived echoes and sequence bonuses never echo again.",
  'chorus.bell-herb': "Copies 75% of the first positive, echoable original reaction for 0.10 presence (less with Tuned Rim). Glass Noodle takes priority. Conductors choose the opener; Aromatic pairs with Fat for Infusion at 40–100°C.",
  'chorus.chime-fruit': "Conductor: moves Browning to the front, or Preservation at 0–60°C. If several conductors are present, the oldest active one leads. Browning before Extraction unlocks Resonant Marrow’s Crescendo. Requires at least 0.25 presence to conduct.",
  'chorus.cream': "Conductor: moves Infusion to the front. Oldest active conductor wins. Fat 2 + Aromatic enables Infusion at 40–100°C; with Quiet Mushroom, following it with Browning unlocks Harmony. Replace an older conductor to change the lead.",
  'chorus.marrow': "Crescendo: at 70–110°C, when Browning scores before Extraction in the same serving, add a derived copy of Extraction worth 100% × this Marrow’s presence. Only the oldest operational Marrow triggers. Protein 2 enables Browning; reversing the order gives no Crescendo.",
  'chorus.mushroom': "Harmony: at 70–100°C, when Infusion scores before Browning in the same serving, add a derived copy of Browning worth 100% × this Mushroom’s presence. Only the oldest operational Mushroom triggers. Silver Cream can conduct Infusion first; reversed order gives no Harmony.",
  'chorus.gel': "At 40–60°C, the oldest echo source retains at least 98% / 96% / 93% after a small / standard / large serving. Echo presence costs still apply first. Mineral enables Extraction with Acid at 50–120°C, helping complete a three-reaction Silver Note serving.",
  'chorus.citrus': "Conductor: moves Extraction to the front (Acid + Mineral at 50–120°C). Oldest active conductor wins. Use it to echo a strong Extraction, but leading Extraction prevents Browning → Extraction Crescendo unless an older conductor leads Browning."
};
export function eventText(event) {
  if (event.type === 'reactionPulse' && event.data.origin === 'derived') return `♫ ${labels[event.sourceId] ?? 'Echo'} +${event.data.total.toFixed(1)}`;
  return null;
}
