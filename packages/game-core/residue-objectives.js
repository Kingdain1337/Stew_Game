// Counters start when a residue is installed; upgrades affect the next bowl.
export const RESIDUE_METRICS = ['browning', 'infusion', 'small', 'grand', 'harvestFour', 'harvestSix', 'cultureGrown', 'strongHarvest', 'burns', 'fullBlaze', 'charSpent', 'hotBrowning', 'echoes', 'chemistryThree', 'sequences'];
export function servingMetrics(state, events, explanation, catalog) {
  const positive = events.filter((event) => event.type === 'reactionPulse' && event.data.total > 0);
  const has = (id) => positive.some((event) => event.sourceId === id);
  const spent = (resource) => events.filter((event) => event.type === 'resourceChanged' && event.data.resource === resource && event.data.delta < 0).reduce((sum, event) => sum - event.data.delta, 0);
  const cultureSpent = spent('culture');
  const chemistry = new Set(positive.filter((event) => event.sourceId.startsWith('core.')).map((event) => event.sourceId)).size;
  return {
    browning: Number(has('core.browning')), infusion: Number(has('core.infusion')),
    small: Number(state.servingSize === 'small'), grand: Number(state.servingSize === 'large' && chemistry >= 2),
    harvestFour: Number(has('culture.harvest') && cultureSpent >= 4), harvestSix: Number(has('culture.harvest') && cultureSpent === 6),
    cultureGrown: events.filter((event) => event.type === 'resourceChanged' && event.data.resource === 'culture' && event.data.delta > 0 && event.sourceId !== 'culture.seasoned-crock').reduce((sum, event) => sum + event.data.delta, 0),
    strongHarvest: Number(has('culture.harvest') && cultureSpent >= 4 && explanation.effectiveProperties.acid >= 2.5),
    burns: events.filter((event) => event.type === 'presenceConsumed' && catalog.cards[event.sourceId]?.tags.includes('furnaceSource')).length,
    fullBlaze: Number(has('hearth.blaze') && spent('char') === 6), charSpent: spent('char'),
    hotBrowning: Number(has('core.browning') && state.temperature >= 90),
    echoes: positive.filter((event) => ['chorus.glass-noodle', 'chorus.bell-herb'].includes(event.sourceId)).length,
    chemistryThree: Number(chemistry >= 3),
    sequences: positive.filter((event) => ['chorus.harmony', 'chorus.crescendo'].includes(event.sourceId)).length
  };
}

export function advanceResidues(state, catalog, metrics, emit) {
  for (const entry of state.residues) {
    const definition = catalog.residues[entry.id];
    if (entry.tier >= definition.maxTier || state.disabledResidueIds.includes(entry.id)) continue;
    const objective = definition.objective;
    const gain = metrics[objective.metric] ?? 0;
    if (gain <= 0) continue;
    const before = entry.progress ?? 0;
    entry.progress = Math.min(objective.target, before + gain);
    emit('residueProgress', entry.id, { before, after: entry.progress, target: objective.target });
    if (entry.progress >= objective.target) {
      entry.tier = 2;
      emit('residueLeveled', entry.id, { tier: 2, objective: objective.text });
    }
  }
}
