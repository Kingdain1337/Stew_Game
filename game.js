/* Runtime/UI layer. It consumes only the data objects in /data and has no build tooling. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const byId = (list, id) => list.find((entry) => entry.id === id);
  const state = { pot:null, encounterIndex:0, round:0, score:0, temperature:STEW_SETTINGS.initialTemperature, previousTemperature:STEW_SETTINGS.initialTemperature, contents:[], offers:[], selected:null, residues:{}, shockUsed:false, shockPending:false, lastBreakdown:null };
  const colors = { Meat:'#b65139', Vegetable:'#77964c', Dairy:'#e7b945', Mineral:'#7f97a3', Fruit:'#e0ae35', Spice:'#c95e35', Fungus:'#715a82' };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function format(number) { return Math.round(number).toLocaleString(); }
  function currentEncounter() { return STEW_ENCOUNTERS[state.encounterIndex]; }
  function ingredient(id) { return byId(STEW_INGREDIENTS, id); }
  function residueStacks(id) { return state.residues[id]?.stacks || 0; }
  function residueEntries() { return Object.values(state.residues); }
  function tempMultiplier(item, temperature = state.temperature) {
    const curve = item.temperature;
    if (temperature <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i++) {
      const [rightTemp, rightValue] = curve[i]; const [leftTemp, leftValue] = curve[i - 1];
      if (temperature <= rightTemp) return leftValue + ((temperature - leftTemp) / (rightTemp - leftTemp)) * (rightValue - leftValue);
    }
    return curve[curve.length - 1][1];
  }
  function activeReactions() {
    return STEW_REACTIONS.map((reaction) => {
      const contributions = {};
      reaction.needs.forEach((need) => contributions[need] = state.contents.reduce((total, entry) => total + ((ingredient(entry.id).properties[need] || 0) * ingredient(entry.id).reactivity * entry.amount), 0));
      const inTemperature = state.temperature >= reaction.minTemp && state.temperature <= reaction.maxTemp;
      const rawStrength = Math.min(...reaction.needs.map((need) => contributions[need]));
      const specificBoost = residueEntries().filter(({residue}) => residue.kind === 'reactionStrength' && residue.reaction === reaction.id).reduce((total, entry) => total + entry.residue.value * entry.stacks, 0);
      const allBoost = residueEntries().filter(({residue}) => residue.kind === 'allReactionStrength').reduce((total, entry) => total + entry.residue.value * entry.stacks, 0);
      const shockBoost = state.shockPending ? 1.5 + residueEntries().filter(({residue}) => residue.kind === 'shock').reduce((total, entry) => total + entry.residue.value * entry.stacks, 0) : 1;
      return { ...reaction, contributions, active: inTemperature && rawStrength > 0, strength: rawStrength * (1 + specificBoost + allBoost) * shockBoost };
    });
  }
  function itemResidueMultiplier(item, temperatureMultiplier) {
    let multiplier = 1;
    residueEntries().forEach(({residue, stacks}) => {
      if (residue.kind === 'temperatureBelow' && state.temperature < residue.threshold) multiplier *= 1 + residue.value * stacks;
      if (residue.kind === 'temperatureAbove' && state.temperature > residue.threshold) multiplier *= 1 + residue.value * stacks;
      if (residue.kind === 'temperatureMultiplier' && temperatureMultiplier >= residue.threshold) multiplier *= 1 + residue.value * stacks;
      if (residue.kind === 'typeScore' && item.type === residue.type) multiplier *= 1 + residue.value * stacks;
      if (residue.kind === 'propertyScore' && item.properties[residue.property]) multiplier *= 1 + residue.value * stacks;
    });
    return multiplier;
  }
  function customerMultiplier(item) {
    const mod = currentEncounter().modifier; let multiplier = 1;
    if (mod.type === 'type') { if (item.type === mod.target) multiplier *= mod.multiplier; if (item.type === mod.penaltyType) multiplier *= mod.penalty; }
    if (mod.type === 'temperature' && state.temperature > mod.threshold) multiplier *= mod.multiplier;
    return multiplier;
  }
  function scoreServing() {
    const reactions = activeReactions();
    const details = state.contents.map((entry) => {
      const item = ingredient(entry.id); const amountServed = entry.amount / state.pot.capacity; const temperature = tempMultiplier(item);
      let reactionMultiplier = 1; const factors = [];
      reactions.filter((reaction) => reaction.active).forEach((reaction) => {
        let gain = 0;
        Object.entries(reaction.effect).forEach(([property, perStrength]) => { if (item.properties[property]) gain += perStrength * reaction.strength; });
        if (gain) {
          const residueBonus = residueEntries().filter(({residue}) => residue.kind === 'reactionScore' && residue.reaction === reaction.id).reduce((sum, entry) => sum + entry.residue.value * entry.stacks, 0);
          reactionMultiplier *= 1 + gain + residueBonus; factors.push(`${reaction.name} ×${(1 + gain + residueBonus).toFixed(2)}`);
        }
      });
      const residue = itemResidueMultiplier(item, temperature); const customer = customerMultiplier(item);
      const total = item.basePower * amountServed * temperature * reactionMultiplier * residue * customer;
      return { item, entry, total, base:item.basePower * amountServed, temperature, reactionMultiplier, residue, customer, factors };
    });
    const total = details.reduce((sum, detail) => sum + detail.total, 0);
    return { total, details, reactions };
  }
  function weightedOffers() {
    const picked = []; const pool = [...STEW_INGREDIENTS];
    while (picked.length < 3 && pool.length) { const index = Math.floor(Math.random() * pool.length); picked.push(pool.splice(index, 1)[0].id); }
    return picked;
  }
  function startGame(pot) {
    Object.assign(state, { pot, encounterIndex:0, round:0, score:0, temperature:STEW_SETTINGS.initialTemperature, previousTemperature:STEW_SETTINGS.initialTemperature, contents:[], offers:weightedOffers(), selected:null, residues:{}, shockUsed:false, shockPending:false, lastBreakdown:null });
    $('#welcome').hidden = true; $('#game').hidden = false; render();
  }
  function renderWelcome() { $('#pot-choices').innerHTML = STEW_POTS.map((pot) => `<button class="pot-choice" data-pot="${pot.id}"><strong>${pot.name}</strong><span>${pot.capacity} L · ${pot.capacity} residue slots</span><small>${pot.description}</small></button>`).join(''); document.querySelectorAll('[data-pot]').forEach((button) => button.addEventListener('click', () => startGame(byId(STEW_POTS, button.dataset.pot)))); }
  function renderStatus() {
    const encounter = currentEncounter(); $('#customer-card').innerHTML = `<p class="eyebrow">Encounter ${state.encounterIndex + 1} of ${STEW_ENCOUNTERS.length}</p><h2>${encounter.name}</h2><p>${encounter.title}</p><p class="customer-modifier">${encounter.text}</p>`;
    $('#total-score').textContent = format(state.score); $('#target-score').textContent = format(encounter.target); $('#score-meter').style.width = `${clamp((state.score / encounter.target) * 100, 0, 100)}%`; $('#round-status').textContent = `Serving ${state.round + 1} of ${encounter.servings}`;
    $('#temperature').textContent = state.temperature; $('#temperature-slider').value = state.temperature; const note = state.temperature < 40 ? 'chilled' : state.temperature < 70 ? 'warming' : state.temperature < 100 ? 'simmering' : 'roaring'; $('#heat-note').textContent = note;
    $('#pot-name').textContent = state.pot.name; $('#capacity-badge').textContent = `${state.pot.capacity} L`; const used = state.contents.reduce((sum, entry) => sum + ingredient(entry.id).volume * entry.amount, 0); $('#pot-volume').textContent = `${used.toFixed(1)} L ingredients in ${state.pot.capacity} L broth`;
    const steam = clamp((state.temperature - 30) / 70, 0, 1); document.querySelectorAll('.steam').forEach((el) => el.style.opacity = steam); $('#pot-visual').style.filter = `saturate(${.7 + steam}) brightness(${.85 + steam * .15})`;
  }
  function renderOffers() { $('#offers').innerHTML = state.offers.map((id) => { const item = ingredient(id); const selected = state.selected === id; return `<button class="ingredient-card ${selected ? 'selected' : ''}" style="--ingredient:${colors[item.type] || '#c77'}" data-ingredient="${id}"><span class="rarity">${item.rarity} · ${item.type}</span><h3>${item.name}</h3><div class="stat-row"><span class="stat">${item.basePower} power</span><span class="stat">${item.volume} L</span><span class="stat">react ×${item.reactivity}</span></div><small>${Object.entries(item.properties).map(([key,value]) => `${key} ${value}`).join(' · ')}<br>Best around ${bestTemp(item)}°C</small></button>`; }).join(''); document.querySelectorAll('[data-ingredient]').forEach((button) => button.addEventListener('click', () => selectOffer(button.dataset.ingredient))); }
  function bestTemp(item) { return item.temperature.reduce((best, point) => point[1] > best[1] ? point : best)[0]; }
  function renderPot() { const capacity = state.pot.capacity; $('#pot-contents').innerHTML = state.contents.length ? state.contents.map((entry) => { const item = ingredient(entry.id); return `<div class="content-row"><div><strong>${item.name}</strong><small>${entry.amount.toFixed(2)} presence</small></div><div class="content-bar"><span style="width:${clamp(entry.amount * 100, 0, 100)}%"></span></div></div>`; }).join('') : '<p class="empty">The pot is clean. Add an ingredient from the pantry.</p>'; }
  function renderReactions() { const reactions = activeReactions(); $('#reactions').innerHTML = reactions.map((reaction) => `<div class="reaction-row ${reaction.active ? '' : 'inactive'}"><div><strong>${reaction.name}</strong><small>${reaction.needs.map((need) => `${need} ${reaction.contributions[need].toFixed(1)}`).join(' + ')} · ${reaction.minTemp}–${reaction.maxTemp}°</small></div><div>${reaction.active ? `<span class="reaction-strength">strength ${reaction.strength.toFixed(2)}</span>` : '<small>inactive</small>'}</div></div>`).join(''); }
  function renderResidues() { const entries = residueEntries(); $('#residue-count').textContent = `${entries.length}/${state.pot.capacity} slots`; $('#residues').innerHTML = entries.length ? entries.map(({residue,stacks}) => `<div class="residue-row"><div><strong>${residue.name}</strong><small>${residue.text}</small></div><span class="badge">×${stacks}</span></div>`).join('') : '<p class="empty">Win an encounter to leave a mark in the pot.</p>'; }
  function renderBreakdown() { if (!state.lastBreakdown) return; const score = state.lastBreakdown; $('#last-serving-total').textContent = `${format(score.total)} pts`; $('#breakdown').classList.remove('empty'); $('#breakdown').innerHTML = score.details.map((detail) => `<div class="breakdown-item"><div class="line"><strong>${detail.item.name}</strong><span>${detail.total.toFixed(1)} pts</span></div><div class="formula">${detail.base.toFixed(1)} base · temp ×${detail.temperature.toFixed(2)} ${detail.factors.map((factor) => `<b>· ${factor}</b>`).join('')} ${detail.residue !== 1 ? `<b>· residue ×${detail.residue.toFixed(2)}</b>` : ''} ${detail.customer !== 1 ? `<b>· customer ×${detail.customer.toFixed(2)}</b>` : ''}</div></div>`).join(''); }
  function renderAction() { const item = state.selected && ingredient(state.selected); $('#selection-summary').innerHTML = item ? `<strong>${item.name}</strong> selected — add it to the stew or discard it before serving.` : 'Choose an ingredient to add to the stew.'; $('#serve-button').disabled = !state.selected; $('#discard-button').disabled = !state.selected; }
  function render() { renderStatus(); renderOffers(); renderPot(); renderReactions(); renderResidues(); renderBreakdown(); renderAction(); }
  function selectOffer(id) { state.selected = id; render(); }
  function resolveThermalShock() { const hasIceSalt = state.contents.some((entry) => entry.id === 'ice-salt'); if (!state.shockUsed && hasIceSalt && state.previousTemperature < STEW_SETTINGS.thermalShockThreshold && state.temperature >= STEW_SETTINGS.thermalShockThreshold) { state.shockUsed = true; state.shockPending = true; state.contents.forEach((entry) => entry.amount *= STEW_SETTINGS.thermalShockRetention); return true; } return false; }
  function addSelected(discard = false) { if (!discard) state.contents.push({id:state.selected, amount:1}); state.selected = null; }
  function serve(discard = false) {
    if (!state.selected) return; addSelected(discard); const shock = resolveThermalShock(); const result = scoreServing(); state.lastBreakdown = result; state.score += result.total;
    // Proportional serving and neutral broth refill: every dissolved presence loses 1 / capacity.
    const fractionLeft = 1 - (STEW_SETTINGS.servingLitres / state.pot.capacity); state.contents.forEach((entry) => entry.amount *= fractionLeft);
    result.reactions.filter((reaction) => reaction.active && reaction.id === 'extraction').forEach(() => state.contents.forEach((entry) => { if (ingredient(entry.id).properties.acid) entry.amount *= STEW_SETTINGS.extractionAcidRetention; }));
    state.contents = state.contents.filter((entry) => entry.amount > STEW_SETTINGS.ingredientRemovalThreshold); state.shockPending = false; state.round += 1; state.previousTemperature = state.temperature;
    if (state.round >= currentEncounter().servings) setTimeout(() => finishEncounter(shock), 350); else { state.offers = weightedOffers(); render(); }
  }
  function dialog(html) { const el = $('#level-dialog'); el.innerHTML = html; el.showModal(); }
  function finishEncounter() {
    const encounter = currentEncounter(); const won = state.score >= encounter.target;
    if (!won) { dialog(`<div class="dialog-inner"><p class="eyebrow">The bowl returns untouched</p><h2>Not enough for ${encounter.name}</h2><p class="loss">${format(state.score)} points against a ${format(encounter.target)} target.</p><p>Try a different draft route or change the temperature before you serve. The breakdown shows exactly where the score went.</p><div class="dialog-actions"><button class="serve-button" id="retry">Try again</button></div></div>`); $('#retry').onclick = () => { $('#level-dialog').close(); const pot = state.pot; startGame(pot); }; return; }
    const choices = [...new Set(state.contents.map((entry) => entry.id))].map(ingredient); const optionHtml = choices.map((item) => `<button class="dialog-option" data-residue="${item.id}"><strong>${item.residue.name}</strong><small>${item.residue.text}<br><br>from ${item.name}</small></button>`).join('');
    dialog(`<div class="dialog-inner"><p class="eyebrow">Encounter cleared</p><h2>${encounter.name} is delighted.</h2><p class="win">${format(state.score)} points, beating ${format(encounter.target)}.</p><p>Choose one ingredient's residue. Existing residues stack; a new kind will replace the oldest mark if your pot is full.</p><div class="dialog-options">${optionHtml}</div></div>`); document.querySelectorAll('[data-residue]').forEach((button) => button.onclick = () => chooseResidue(button.dataset.residue));
  }
  function chooseResidue(itemId) { const item = ingredient(itemId); const existing = state.residues[item.residue.id]; if (existing) existing.stacks++; else { if (residueEntries().length >= state.pot.capacity) delete state.residues[residueEntries()[0].residue.id]; state.residues[item.residue.id] = { residue:item.residue, stacks:1 }; } $('#level-dialog').close(); state.encounterIndex++; if (state.encounterIndex >= STEW_ENCOUNTERS.length) { showVictory(); return; } state.round = 0; state.score = 0; state.offers = weightedOffers(); state.selected = null; state.lastBreakdown = null; render(); }
  function showVictory() { dialog(`<div class="dialog-inner"><p class="eyebrow">Storyline complete</p><h2>The castle knows your stew.</h2><p class="win">Three customers served, and your ${state.pot.name} has gathered ${residueEntries().length} permanent marks.</p><p>This is the V1 loop: reactions, heat, concentration, encounter pressure, and curated pot history. Start another storyline to explore a different build.</p><div class="dialog-actions"><button class="serve-button" id="again">Cook again</button></div></div>`); $('#again').onclick = () => { $('#level-dialog').close(); startGame(state.pot); }; }
  $('#temperature-slider').addEventListener('input', (event) => { state.previousTemperature = state.temperature; state.temperature = Number(event.target.value); const shocked = resolveThermalShock(); render(); if (shocked) $('#selection-summary').innerHTML = '<strong>Thermal Shock!</strong> Active reactions will surge on the next serving, but the stew has lost 15% of its remaining presence.'; });
  $('#serve-button').addEventListener('click', () => serve(false)); $('#discard-button').addEventListener('click', () => serve(true)); $('#new-game').addEventListener('click', () => { $('#game').hidden = true; $('#welcome').hidden = false; renderWelcome(); });
  renderWelcome();
})();
