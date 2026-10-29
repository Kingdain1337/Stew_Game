export function installTooltips(popover) {
  let anchor = null;
  let touchKeyword = null;

  function place() {
    if (!anchor?.isConnected) { hide(); return; }
    const rect = anchor.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const margin = 8;
    const left = Math.max(margin, Math.min(innerWidth - width - margin, rect.left + rect.width / 2 - width / 2));
    const below = rect.bottom + 9;
    const top = below + height < innerHeight - margin ? below : Math.max(margin, rect.top - height - 9);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function show(element) {
    if (anchor === element) return;
    anchor = element;
    const modal = element.closest('dialog[open]');
    (modal ?? document.body).append(popover);
    popover.textContent = element.dataset.tooltip;
    popover.hidden = false;
    place();
  }

  function hide() { anchor = null; popover.hidden = true; }

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const element = event.target.closest?.('[data-tooltip]');
    if (element) show(element);
  });
  document.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'touch') return;
    if (anchor && !anchor.contains(event.relatedTarget)) hide();
  });
  // Touch has no durable hover. Tapping a keyword toggles its explanation
  // without also selecting/re-rendering the surrounding ingredient card.
  document.addEventListener('pointerdown', (event) => {
    touchKeyword = null;
    if (event.pointerType !== 'touch') return;
    const element = event.target.closest?.('[data-tooltip]');
    if (element) {
      touchKeyword = element;
      if (anchor === element) hide(); else show(element);
      event.preventDefault();
    } else if (!popover.contains(event.target)) hide();
  }, { capture: true, passive: false });
  document.addEventListener('click', (event) => {
    if (touchKeyword?.contains(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
    touchKeyword = null;
  }, true);
  document.addEventListener('focusin', (event) => {
    const element = event.target.closest?.('[data-tooltip]');
    if (element) show(element);
    else hide();
  });
  document.addEventListener('focusout', (event) => {
    if (anchor && !anchor.contains(event.relatedTarget)) hide();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', () => { if (anchor) place(); }, true);
  return { hide };
}
