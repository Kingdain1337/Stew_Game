export const SERVING_SIZES = [
  { id: 'small', name: 'Small', volume: .2, multiplier: .65, text: '×0.65 points · slow decay · save your engine' },
  { id: 'standard', name: 'Standard', volume: .4, multiplier: 1, text: '×1 points · steady appetite' },
  { id: 'large', name: 'Large', volume: .7, multiplier: 1.5, text: '×1.5 points · faster decay · make room' }
];
export const STOCKS = [
  ['herb', 'Garden Rinse', { aromatic: .18, mineral: .1 }, 'pantry.onion'],
  ['bone', 'Thin Bone Stock', { protein: .18, mineral: .1 }, 'hearth.marrow'],
  ['orchard', 'Orchard Water', { sugar: .18, acid: .1 }, 'culture.plum'],
  ['mushroom', 'Mushroom Water', { aromatic: .14, protein: .14 }, 'culture.candycap'],
  ['citrus', 'Citrus Rinse', { acid: .18, sugar: .1 }, 'pantry.lemon'],
  ['root', 'Root Simmer', { mineral: .18, sugar: .1 }, 'culture.peel']
].map(([id, name, properties, imageId]) => ({
  id: `pantry.stock-${id}`, deckId: 'pantry', name, properties, imageId, type: 'Stock', system: true, stock: true,
  basePower: 6, volume: .6, reactivity: 1, tags: [], rarity: 'common', temperature: [[0, 1], [120, 1]],
  text: 'A weak 0.6 L starting stock. Low base points and two faint properties, both fading with presence. Below 0.15 presence its remaining volume joins the stronger shared Broth. Cannot fuel a furnace.'
}));
export function servingSize(state) { return SERVING_SIZES.find((entry) => entry.id === (state.servingSize ?? 'standard')); }
