// Mobile uses a paused, pre-rendered film. Native scrolling never waits for a seek.
export function startMobileTour(backdrop, reduced) {
  const portrait = matchMedia('(orientation: portrait)');
  const cover = backdrop.querySelector('.tour-cover');
  const cue = document.querySelector('.scroll-cue');
  const still = new Image();
  still.className = 'tour-still';
  still.alt = '';
  still.hidden = true;
  backdrop.append(still);
  let video, base, span, frame, nextSeek, stall, lastSeek = 0, useStills = false;
  const scenes = [[0, 'start'], [.15, 'deck'], [.37, 'frame'], [.66, 'envelope'], [.91, 'end']];

  function measure() {
    span = Math.max(1, document.scrollingElement.scrollHeight - document.documentElement.clientHeight);
    schedule();
  }
  function progress() { return Math.min(1, Math.max(0, window.scrollY / span)); }
  function showStill() {
    useStills = true;
    const step = scenes.filter(([start]) => progress() >= start).pop()[1];
    const src = base + '-' + step + '.webp';
    if (still.getAttribute('src') !== src) still.src = src;
    still.hidden = step === 'start';
    if (video) video.hidden = true;
  }
  function waitForVideo() {
    if (!stall) stall = setTimeout(() => { stall = 0; showStill(); }, 1500);
  }
  function paint() {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    if (useStills) showStill();
    if (!video || video.readyState < 1 || !Number.isFinite(video.duration) || video.seeking) return;
    const desired = Math.min(video.duration - .001, Math.round(progress() * 240) / 24);
    const distance = Math.abs(video.currentTime - desired);
    if (distance < .021 && video.readyState >= 2) {
      clearTimeout(stall);
      stall = 0;
      useStills = false;
      still.hidden = true;
      video.hidden = false;
      return;
    }
    // During a fast fling, skip intermediate frames and leave time for the page to scroll.
    const interval = distance > .28 ? 112 : 48;
    const delay = Math.max(0, interval - (performance.now() - lastSeek));
    if (delay) {
      if (!nextSeek) nextSeek = setTimeout(() => { nextSeek = 0; schedule(); }, delay);
      return;
    }
    if (distance >= .021) {
      lastSeek = performance.now();
      waitForVideo();
      video.currentTime = desired;
    }
  }
  function schedule() {
    if (!frame && !reduced.matches && !document.hidden) frame = requestAnimationFrame(paint);
  }
  function release() {
    cancelAnimationFrame(frame);
    clearTimeout(nextSeek);
    clearTimeout(stall);
    frame = nextSeek = stall = 0;
    if (video) {
      video.onloadedmetadata = video.onloadeddata = video.onseeked = video.oncanplay = video.onerror = null;
      video.remove();
      video.removeAttribute('src');
      video.load();
      video = null;
    }
    still.hidden = true;
    still.removeAttribute('src');
    useStills = false;
  }
  function start() {
    release();
    cover.hidden = false;
    cue.hidden = reduced.matches;
    if (reduced.matches || document.hidden) return;
    base = 'assets/woodland/tour-' + (portrait.matches ? 'portrait' : 'wide');
    measure();
    const player = document.createElement('video');
    const formats = ['mp4','webm'].filter(ext => player.canPlayType('video/' + ext));
    if (!formats.length) { showStill(); return; }
    video = player;
    video.className = 'tour-film';
    video.hidden = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    video.onloadedmetadata = video.onloadeddata = video.oncanplay = schedule;
    video.onseeked = () => {
      clearTimeout(stall);
      stall = 0;
      useStills = false;
      still.hidden = true;
      player.hidden = false;
      schedule();
    };
    const loadNext = () => {
      const ext = formats.shift();
      if (!ext) { release(); showStill(); return; }
      player.src = base + '.' + ext;
      waitForVideo();
    };
    video.onerror = loadNext;
    backdrop.append(video);
    loadNext();
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);
  portrait.addEventListener('change', start);
  reduced.addEventListener('change', start);
  document.addEventListener('visibilitychange', start);
  window.addEventListener('pagehide', release);
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
  start();
}
