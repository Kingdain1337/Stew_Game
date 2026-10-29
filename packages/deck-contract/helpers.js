export const MIN_OPERATIONAL_PRESENCE = 0.25;

export function operational(entry) {
  return entry.presence >= MIN_OPERATIONAL_PRESENCE;
}

export function cardOf(catalog, entry) {
  return catalog.cards[entry.cardId];
}

export function oldest(entries) {
  return [...entries].sort((a, b) => a.addedAt - b.addedAt || a.instanceId.localeCompare(b.instanceId))[0] ?? null;
}

export function effectiveProperty(state, catalog, property) {
  return state.contents.reduce((sum, entry) => {
    const card = cardOf(catalog, entry);
    return sum + (card.properties[property] ?? 0) * card.reactivity * entry.presence;
  }, 0);
}

export function propertyParticipants(state, catalog, property) {
  return state.contents.filter((entry) => (cardOf(catalog, entry).properties[property] ?? 0) > 0);
}

export function withTag(state, catalog, tag) {
  return state.contents.filter((entry) => cardOf(catalog, entry).tags.includes(tag) && operational(entry));
}

export function residueTier(state, residueId) {
  if (state.disabledResidueIds?.includes(residueId)) return 0;
  return state.residues.find((entry) => entry.id === residueId)?.tier ?? 0;
}

// Strong authored residues retain their original level-one and maximum power,
// with smooth gains at every intermediate rarity-dependent level.
export function residuePower(state, residueId, maxTier) {
  const tier = residueTier(state, residueId);
  return tier ? 1 + (tier - 1) / (maxTier - 1) : 0;
}
