const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const nativeTour = matchMedia('(pointer: coarse), (max-width: 760px), (max-aspect-ratio: 1/1)').matches;
const backdrop = document.querySelector('.site-backdrop');
if (nativeTour) {
  backdrop.classList.add('native-tour');
  import('./mobile-tour.js').then(module => module.startMobileTour(backdrop, reduced));
} else {
  backdrop.append(document.querySelector('#desktop-camera').content.cloneNode(true));
  import('./desktop-backdrop.js');
}

const officeMap = document.querySelector('.office-map');
const mapToggle = document.querySelector('.map-toggle');
function openMap() {
  officeMap.src = officeMap.dataset.src;
  officeMap.hidden = false;
  mapToggle.hidden = true;
}
if (nativeTour) {
  mapToggle.hidden = false;
  mapToggle.addEventListener('click', () => { openMap(); officeMap.focus(); }, { once: true });
} else openMap();

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
