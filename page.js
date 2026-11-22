import { phases, sampleTimeline, groundOpening, createPainter, createFlatPainter } from './construction-backdrop.js';

const hero = document.querySelector('.build-hero');
const backdrop = document.querySelector('.site-backdrop');
const camera = backdrop.querySelector('.site-camera');
const poster = backdrop.querySelector('.site-poster');
const cue = hero.querySelector('.scroll-cue');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobileComposition = matchMedia('(max-width: 760px), (max-aspect-ratio: 1/1)');
const drawing = backdrop.querySelector('.ground-drawing');
const detail = drawing.querySelector('.plan-detail');
const sillMark = drawing.querySelector('.sill-mark');
const foundation = drawing.querySelector('.rising-foundation');
const cap = drawing.querySelector('.foundation-cap');
const shadow = drawing.querySelector('.footing-shadow');
const material = drawing.querySelector('#footing-material');
const materialImage = material.querySelector('image');
let canvas = backdrop.querySelector('canvas');
let paint;
let failed = false;
let scheduled = false;
let revision = 0;
let previousTime = 0;
let paintedTime;
let direction = 1;
const images = new Map();
const empty = document.createElement('canvas');
empty.width = empty.height = 1;

// The bases stay on the survey line. Sort far-to-near so the returns of the
// garage and the porch meet correctly when the near faces come into view.
function makeFootings() {
  const corners = Array.from(drawing.querySelector('#sill').points, p => [p.x, p.y]);
  const faces = corners.map((a, i) => ({ a, b: corners[(i + 1) % corners.length] }));
  faces.sort((p, q) => p.a[1] + p.b[1] - q.a[1] - q.b[1]);
  const parent = drawing.querySelector('.foundation-faces');
  const svgNS = 'http://www.w3.org/2000/svg';
  for (const face of faces) {
    const [x, y] = face.a, [u, v] = face.b;
    const shade = (y - v) / Math.hypot(u - x, v - y);
    const grey = Math.round(155 + 34 * shade);
    face.surface = document.createElementNS(svgNS, 'path');
    face.surface.setAttribute('fill', 'rgb(' + [grey + 10, grey + 5, grey - 5].join(',') + ')');
    face.grain = document.createElementNS(svgNS, 'path');
    face.grain.setAttribute('fill', 'url(#footing-material)');
    face.grain.setAttribute('opacity', '.92');
    parent.append(face.surface, face.grain);
  }
  return faces;
}
const footings = makeFootings();

// The two long edges are registered to the same camera as the footing survey.
function sheetEdge(u) {
  return [[432 + 1218 * u, 566 + 46 * u], [119 + 1246 * u, 776 + 111 * u]];
}

// Map the printed triangle to its three points on the curved paper surface.
function triangleMatrix([a, b, c], [p, q, r]) {
  const bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
  const det = bx * cy - by * cx;
  const coefficients = i => [
    ((q[i] - p[i]) * cy - (r[i] - p[i]) * by) / det,
    ((r[i] - p[i]) * bx - (q[i] - p[i]) * cx) / det
  ];
  const [xx, xy] = coefficients(0), [yx, yy] = coefficients(1);
  return 'matrix(' + [xx, yx, xy, yy, p[0] - xx * a[0] - xy * a[1], p[1] - yx * a[0] - yy * a[1]].join(' ') + ')';
}

function makePaperRoll() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const defs = drawing.querySelector('defs');
  const paper = drawing.querySelector('.paper-base');
  const exposed = drawing.querySelector('#open-sheet');
  const curl = drawing.querySelector('.paper-curl');
  const shell = curl.querySelector('.curl-shell'), farRim = curl.querySelector('.far-rim');
  const cap = curl.querySelector('.curl-cap'), spiral = cap.querySelector('.curl-spiral');
  const castShadow = curl.querySelector('.curl-shadow');
  const ink = curl.querySelector('.wrapped-ink');
  const spiralPoints = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, angle = t * Math.PI * 5, radius = .17 + .74 * t;
    spiralPoints.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  spiral.setAttribute('d', 'M' + spiralPoints.join('L'));
  const strips = Array.from({ length: 8 }, (_, i) => {
    const clip = document.createElementNS(svgNS, 'clipPath');
    clip.id = 'paper-band-' + i;
    const polygon = document.createElementNS(svgNS, 'polygon');
    clip.append(polygon);
    defs.append(clip);
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('clip-path', 'url(#' + clip.id + ')');
    const print = document.createElementNS(svgNS, 'use');
    print.setAttribute('href', '#printed-plan');
    group.append(print);
    ink.append(group);
    return { polygon, print };
  });

  return (progress, opacity) => {
    const u = .91 * (1 - progress);
    const [far, near] = sheetEdge(u);
    const [endFar, endNear] = sheetEdge(1);
    exposed.setAttribute('points', [far, endFar, endNear, near].join(' '));
    paper.setAttribute('opacity', opacity);
    curl.style.display = progress === 1 ? 'none' : '';
    if (progress === 1) return;

    // Paper remaining on the cylinder is proportional to its cross-sectional area.
    const radius = 37 * Math.sqrt(1 - progress);
    const dx = near[0] - far[0], dy = near[1] - far[1], length = Math.hypot(dx, dy);
    const ax = dx / length, ay = dy / length;
    const nx = ay, ny = -ax;
    const farRadius = radius * .85, capDepth = .64;
    const rise = Math.hypot(ny, ay * capDepth);
    const farY = far[1] - rise * farRadius, nearY = near[1] - rise * radius;
    shell.setAttribute('transform', 'matrix(' + [radius * nx, radius * ny, dx, nearY - farY, far[0], farY].join(' ') + ')');
    farRim.setAttribute('transform', 'scale(.85 ' + (farRadius * capDepth / length) + ')');
    cap.setAttribute('transform', 'matrix(' + [radius * nx, radius * ny, ax * radius * capDepth, ay * radius * capDepth, near[0], nearY].join(' ') + ')');
    const turns = 2 * .91 * 1218 / 37 * (1 - Math.sqrt(1 - progress));
    spiral.setAttribute('transform', 'rotate(' + (-turns * 180 / Math.PI) + ')');
    castShadow.setAttribute('d', 'M' + far + 'l' + [farRadius * 1.02, farRadius * .17] +
      'L' + [near[0] + radius * 1.07, near[1] + radius * .23] + 'L' + near + 'Z');

    function bandEdge(angle) {
      const cos = -Math.cos(angle), sin = -capDepth * Math.sin(angle);
      const x = nx * cos + ax * sin, y = ny * cos + ay * sin;
      return {
        source: sheetEdge(u - (Math.PI - angle) * radius / 1218),
        far: [far[0] + farRadius * x, farY + farRadius * y],
        near: [near[0] + radius * x, nearY + radius * y]
      };
    }
    let from = bandEdge(0);
    strips.forEach(({ polygon, print }, i) => {
      const to = bandEdge(Math.PI * (i + 1) / strips.length);
      polygon.setAttribute('points', [from.far, to.far, to.near, from.near].join(' '));
      print.setAttribute('transform', triangleMatrix([from.source[0], to.source[0], from.source[1]], [from.far, to.far, from.near]));
      from = to;
    });
  };
}
const drawPaper = makePaperRoll();
drawPaper(0, 1);

function drawOpening(time, sitePhoto) {
  const { unroll, paper, height, detail: lineOpacity, ink, photo } = groundOpening(time);
  drawing.style.display = photo === 1 ? 'none' : '';
  if (photo === 1) return;
  drawPaper(unroll, paper);
  const src = sitePhoto.getAttribute('src');
  if (materialImage.getAttribute('href') !== src) materialImage.setAttribute('href', src);
  material.setAttribute('patternTransform', 'translate(0 ' + (36 - height) + ')');
  detail.setAttribute('opacity', lineOpacity);
  sillMark.setAttribute('opacity', ink);
  foundation.setAttribute('opacity', Math.min(1, height / 8) * (1 - photo * photo));
  cap.setAttribute('transform', 'translate(0 ' + -height + ')');
  shadow.setAttribute('transform', 'translate(' + height * .16 + ' ' + height * .07 + ')');
  for (const { a: [x, y], b: [u, v], surface, grain } of footings) {
    const d = 'M' + x + ' ' + y + 'L' + u + ' ' + v + 'v' + -height + 'L' + x + ' ' + (y - height) + 'Z';
    surface.setAttribute('d', d);
    grain.setAttribute('d', d);
  }
}

function load(name, small) {
  const file = name + (small ? '-sm' : '');
  if (!images.has(file)) {
    const photo = new Image();
    photo.decoding = 'async';
    photo.src = 'assets/woodland/' + file + '.webp';
    images.set(file, photo.decode().then(() => photo).catch(error => {
      images.delete(file);
      throw error;
    }));
  }
  return images.get(file);
}

function preloadPhase(index, small) {
  if (!phases[index]) return;
  load(phases[index].name, small).catch(() => {});
  if (index === 2) load('wall-lift', false).catch(() => {});
  if (index === 4) load('rig', false).catch(() => {});
}

function useFlatCanvas() {
  const replacement = canvas.cloneNode(false);
  canvas.replaceWith(replacement);
  canvas = replacement;
  paintedTime = undefined;
  paint = createFlatPainter(canvas);
}

function setup() {
  try {
    paint = createPainter(canvas);
  } catch {
    // A context can exist even when GPU shader compilation is unavailable.
  }
  if (!paint) useFlatCanvas();
  else canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    useFlatCanvas();
    schedule();
  }, { once: true });
}

function showPoster() {
  canvas.hidden = true;
  poster.hidden = false;
  if (failed) {
    drawing.style.display = 'none';
    poster.querySelector('img').srcset = 'assets/woodland/complete-sm.webp 900w, assets/woodland/complete.webp 1672w';
  }
  cue.hidden = true;
}

async function render() {
  scheduled = false;
  const id = ++revision;
  const shade = Math.max(0, Math.min(1, hero.getBoundingClientRect().bottom / (hero.offsetHeight * .6)));
  backdrop.style.setProperty('--intro-shade', String(shade));
  if (reduced.matches || failed) { showPoster(); return; }
  const page = document.scrollingElement;
  const span = Math.max(1, page.scrollHeight - page.clientHeight);
  const sample = sampleTimeline(page.scrollTop / span);
  if (mobileComposition.matches) {
    // Follow the unfurling sheet, then open the frame to include both wings of the house.
    const focus = 92 - 37 * groundOpening(sample.time).unroll;
    const reveal = Math.min(1, Math.max(0, (sample.time - 6.3) / 3.1));
    const ease = reveal * reveal * (3 - 2 * reveal);
    backdrop.style.setProperty('--mobile-focus', focus + '%');
    backdrop.style.setProperty('--camera-tall', (1 - ease) * 100 + '%');
    backdrop.style.setProperty('--camera-wide', ease * 72 + 'vw');
    backdrop.style.setProperty('--feather', ease * 13 + '%');
  }
  if (sample.time !== previousTime) direction = Math.sign(sample.time - previousTime);
  previousTime = sample.time;
  const { current, next, fraction } = sample;
  const last = fraction > 0 ? next : current;
  const sourceWidth = Math.max(camera.clientWidth, camera.clientHeight * 1672 / 941);
  const small = sourceWidth * window.devicePixelRatio <= 900;
  const width = small ? 900 : 1672;
  if (!canvas.hidden && canvas.width === width && sample.time === paintedTime) return;
  try {
    if (!paint) setup();
    if (!paint) { failed = true; showPoster(); return; }
    const layers = await Promise.all([
      load(phases[current].name, small),
      load(phases[last].name, small),
      current === 4 || last === 4 ? load('rig', false) : empty,
      current === 2 || last === 2 ? load('wall-lift', false) : empty
    ]);
    if (id !== revision || reduced.matches) return;
    if (canvas.width !== width) {
      canvas.width = width;
      canvas.height = Math.round(width * 941 / 1672);
    }
    paint(sample, layers);
    paintedTime = sample.time;
    drawOpening(sample.time, layers[0]);
    canvas.hidden = false;
    poster.hidden = true;
    cue.hidden = false;
    preloadPhase(direction > 0 ? last + 1 : current - 1, small);
  } catch {
    // Keep the last rendered phase while a new layer is unavailable.
    if (id === revision && canvas.hidden) showPoster();
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
window.addEventListener('pageshow', schedule);
window.addEventListener('online', schedule);
new ResizeObserver(schedule).observe(document.body);
reduced.addEventListener('change', schedule);
schedule();

for (const picker of document.querySelectorAll('.room-picker')) {
  const buttons = Array.from(picker.querySelectorAll('button'));
  function showExample(selected) {
    for (const button of buttons) {
      const active = selected === button;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
      button.setAttribute('aria-pressed', String(active));
    }
  }
  for (const button of buttons) button.addEventListener('click', () => showExample(button));
  showExample(buttons[0]);
  picker.hidden = false;
}

const callDialog = document.querySelector('.call-dialog');
const talkLink = document.querySelector('.talk-owners');
if (callDialog.showModal) {
  talkLink.setAttribute('aria-haspopup', 'dialog');
  talkLink.addEventListener('click', event => { event.preventDefault(); callDialog.showModal(); });
  callDialog.querySelector('.write-instead').addEventListener('click', () => {
    callDialog.close();
    document.querySelector('#project-inquiry select').focus({ preventScroll: true });
  });
  callDialog.addEventListener('click', event => {
    const box = callDialog.getBoundingClientRect();
    if (event.target === callDialog && (event.clientX < box.left || event.clientX > box.right ||
        event.clientY < box.top || event.clientY > box.bottom)) callDialog.close();
  });
}

const pins = Array.from(document.querySelectorAll('.wall-pin'));
for (const pin of pins) {
  const note = document.getElementById(pin.getAttribute('aria-controls'));
  const sync = () => pin.setAttribute('aria-expanded', String(note.open));
  note.addEventListener('toggle', sync);
  pin.addEventListener('click', () => {
    note.open = true;
    note.querySelector('summary').focus({ preventScroll: true });
    note.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' });
  });
  sync();
  pin.hidden = false;
}

const inquiry = document.querySelector('.inquiry-form');
const projectField = inquiry.elements.namedItem('project');
for (const link of document.querySelectorAll('a[data-project]')) {
  link.addEventListener('click', () => { projectField.value = link.dataset.project; });
}
inquiry.addEventListener('submit', event => {
  event.preventDefault();
  const recipient = document.getElementById(inquiry.elements.namedItem('recipient').value);
  const address = recipient.querySelector('.owner-email').getAttribute('href');
  const subject = encodeURIComponent('Prestige Builders — ' + projectField.value);
  const body = encodeURIComponent(inquiry.elements.namedItem('message').value.trim());
  window.location.href = address + '?subject=' + subject + '&body=' + body;
});
inquiry.hidden = false;

const printButton = document.querySelector('.print-scope-button');
printButton.hidden = false;
printButton.addEventListener('click', () => {
  document.body.classList.add('printing-scope');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('printing-scope'));
