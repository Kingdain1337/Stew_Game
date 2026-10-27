const hash = (value) => [...String(value)].reduce((n, char) => (Math.imul(n, 31) + char.charCodeAt(0)) >>> 0, 17);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createPotPhysics(interior, bubbleLayer) {
  const bodies = new Map();
  const bubbles = [];
  let heat = 80;
  let last = 0;
  let bubbleTimer = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function bounds() { return { width: interior.clientWidth || 230, height: interior.clientHeight || 145 }; }

  function sync(contents, catalog) {
    const current = new Set(contents.map((entry) => entry.instanceId));
    for (const [id, body] of bodies) {
      if (!current.has(id)) { body.element.remove(); bodies.delete(id); }
    }
    const { width, height } = bounds();
    for (const entry of contents) {
      const card = catalog.cards[entry.cardId];
      if (!card) continue;
      const presence = card.id === 'pantry.broth' ? clamp((entry.volume ?? .25) / .4, .15, 1) : clamp(entry.presence ?? 1, 0, 1);
      const size = clamp(23 + 25 * Math.sqrt(presence), 21, 49);
      let body = bodies.get(entry.instanceId);
      if (!body) {
        const element = document.createElement('div');
        element.className = 'pot-ingredient';
        element.dataset.instance = entry.instanceId;
        element.dataset.cardId = entry.cardId;
        element.title = `${card.name}: ${presence.toFixed(2)} presence`;
        element.innerHTML = `<img src="assets/ingredients/${encodeURIComponent(card.imageId ?? card.id)}.png" alt="" draggable="false">`;
        interior.append(element);
        const seed = hash(entry.instanceId);
        body = { element, x: 20 + (seed % Math.max(1, width - 60)), y: 12 + ((seed >>> 8) % Math.max(1, height - 55)), vx: ((seed % 7) - 3) * 5, vy: 0, size, phase: seed % 360 };
        bodies.set(entry.instanceId, body);
      }
      body.size = size;
      body.element.style.width = `${size}px`;
      body.element.style.height = `${size}px`;
      body.element.style.setProperty('--presence', presence.toFixed(3));
      body.element.title = `${card.name}: ${presence.toFixed(2)} presence`;
      body.x = clamp(body.x, 0, Math.max(0, width - size));
      body.y = clamp(body.y, 0, Math.max(0, height - size));
      body.element.style.transform = `translate3d(${body.x}px,${body.y}px,0)`;
    }
  }

  function spawnBubble(width, height) {
    const element = document.createElement('i');
    element.className = 'pot-bubble';
    const size = 5 + Math.random() * 12;
    const bubble = { element, x: 12 + Math.random() * Math.max(1, width - 24), y: height - 4, vy: 35 + heat * .8, size };
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    bubbleLayer.append(element);
    bubbles.push(bubble);
  }

  function frame(time) {
    const dt = Math.min(.04, Math.max(0, (time - (last || time)) / 1000));
    last = time;
    const { width, height } = bounds();
    if (!document.hidden && interior.offsetParent && !reducedMotion) {
      const intensity = heat / 120;
      for (const body of bodies.values()) {
        body.phase += dt * (1.4 + intensity * 5);
        body.vx += Math.sin(body.phase) * intensity * 28 * dt;
        body.vy += (90 - intensity * 120) * dt;
        body.vx *= .995;
        body.vy *= .99;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        if (body.x < 0 || body.x > width - body.size) { body.x = clamp(body.x, 0, Math.max(0, width - body.size)); body.vx *= -.68; }
        if (body.y < 0 || body.y > height - body.size) { body.y = clamp(body.y, 0, Math.max(0, height - body.size)); body.vy *= -.62; }
      }
      const all = [...bodies.values()];
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        const ax = a.x + a.size / 2, ay = a.y + a.size / 2, bx = b.x + b.size / 2, by = b.y + b.size / 2;
        const dx = bx - ax, dy = by - ay, distance = Math.hypot(dx, dy) || 1;
        const overlap = (a.size + b.size) * .35 - distance;
        if (overlap > 0) {
          const nx = dx / distance, ny = dy / distance;
          a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
          b.x += nx * overlap / 2; b.y += ny * overlap / 2;
          a.vx -= nx * 12; a.vy -= ny * 12; b.vx += nx * 12; b.vy += ny * 12;
        }
      }
      for (const body of all) body.element.style.transform = `translate3d(${body.x}px,${body.y}px,0) rotate(${Math.sin(body.phase) * intensity * 8}deg)`;
      bubbleTimer += dt * (1 + intensity * 9);
      while (bubbleTimer >= 1) { spawnBubble(width, height); bubbleTimer -= 1; }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const bubble = bubbles[i];
        bubble.y -= bubble.vy * dt;
        bubble.x += Math.sin(time / 250 + i) * dt * 10;
        bubble.element.style.transform = `translate3d(${bubble.x}px,${bubble.y}px,0)`;
        bubble.element.style.opacity = String(clamp(bubble.y / height, 0, .85));
        if (bubble.y < -bubble.size) { bubble.element.remove(); bubbles.splice(i, 1); }
      }
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return {
    sync,
    setHeat(value) { heat = value; },
    excite(ids, energy = 80) {
      for (const id of ids) {
        const body = bodies.get(id);
        if (!body) continue;
        body.vx += (hash(id + String(last)) % 2 ? 1 : -1) * energy;
        body.vy -= energy * .65;
      }
    }
  };
}
