// Show one still during an inertial swipe. Decode and dissolve to the selected
// construction stage as the gesture slows, without seeking a video on iOS.
const stages = [
  { at: 0, name: 'start' },
  { at: .13, name: 'deck' },
  { at: .365, name: 'frame' },
  { at: .65, name: 'envelope' },
  { at: .895, name: 'end' },
];

export function startPhotoTour(backdrop, reduced) {
  const cover = backdrop.querySelector('.tour-cover');
  const cue = document.querySelector('.scroll-cue');
  const portrait = matchMedia('(orientation: portrait)');
  const unavailable = new Set();
  let extent, lastY, lastTime, timer;
  let active = null, pending = null, fade = null;
  let activeStage = 0, requestedStage = 0;

  function cancelPending() {
    fade?.cancel();
    fade = null;
    pending?.remove();
    pending = null;
    requestedStage = activeStage;
  }

  async function showStage() {
    if (reduced.matches || document.hidden) return;
    const progress = window.scrollY / extent;
    let target = 0;
    for (let i = 1; i < stages.length && progress >= stages[i].at; i++) target = i;
    if (target === requestedStage) return;
    cancelPending();
    if (target === activeStage || unavailable.has(target)) return;
    requestedStage = target;

    const photo = new Image();
    photo.alt = '';
    photo.className = 'tour-photo';
    photo.decoding = 'async';
    photo.src = 'assets/woodland/tour-' + (portrait.matches ? 'portrait' : 'wide') + '-' + stages[target].name + '.webp';
    pending = photo;
    try {
      await photo.decode();
      if (pending !== photo) return;
      backdrop.append(photo);
      if (photo.animate) {
        fade = photo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
        await fade.finished;
      }
      if (pending !== photo) return;
      active?.remove();
      active = photo;
      activeStage = target;
      cover.hidden = true;
      fade = pending = null;
    } catch {
      if (pending === photo) {
        unavailable.add(target);
        cancelPending();
      }
    }
  }

  function onScroll() {
    if (reduced.matches || document.hidden) return;
    const now = performance.now();
    const y = window.scrollY;
    const speed = Math.abs(y - lastY) / Math.max(1, now - lastTime);
    lastY = y;
    lastTime = now;
    clearTimeout(timer);
    if (speed > 1.5) {
      if (pending) cancelPending();
      timer = setTimeout(showStage, 125);
    } else {
      showStage();
    }
  }

  function measure() {
    extent = Math.max(1, document.scrollingElement.scrollHeight - document.documentElement.clientHeight);
  }

  function onResize() {
    measure();
    clearTimeout(timer);
    timer = setTimeout(showStage, 125);
  }

  function reset() {
    clearTimeout(timer);
    cancelPending();
    active?.remove();
    active = null;
    activeStage = requestedStage = 0;
    unavailable.clear();
    cover.hidden = false;
    cue.hidden = reduced.matches;
    lastTime = performance.now();
    lastY = window.scrollY;
    measure();
    showStage();
  }

  const resize = new ResizeObserver(onResize);
  resize.observe(document.body);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('online', () => { unavailable.clear(); showStage(); });
  window.addEventListener('pageshow', reset);
  document.addEventListener('visibilitychange', reset);
  portrait.addEventListener('change', reset);
  reduced.addEventListener('change', reset);
  reset();
}
