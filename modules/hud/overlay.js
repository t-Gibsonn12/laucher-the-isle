const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const DEFAULT_CHARACTER = {
  name: 'Triceratops',
  stage: 'Prime Elder',
  growth: 96,
  health: 100,
  stamina: 82,
  hunger: 21,
  thirst: 72,
  nutrition: { carbs: 570.7, protein: 354.0, fat: 874.1 },
  prime: [
    { label: 'Đã đạt Prime Elder', done: true },
    { label: 'Ghé Khu bảo tồn khi còn non', done: true },
    { label: 'Đạt chế độ ăn hoàn hảo', done: true },
    { label: 'Ghé 2 Khu Di cư', done: true },
    { label: 'Ghé 4 Khu Tuần tra', done: true },
    { label: 'Không bao giờ bị vô sinh', done: true },
    { label: 'Không bị co thắt cơ', done: true },
    { label: 'Được sinh ra từ tổ', done: false },
    { label: 'Nuôi con đến giai đoạn cận trưởng thành', done: false },
    { label: 'Chơi Hypsi, Troodon, Beipi, Dryo hoặc Deino', done: false }
  ]
};

let runtimeContext = {};
let character = { ...DEFAULT_CHARACTER };
let menuOpen = false;

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = String(value ?? '');
}

function setBar(selector, value) {
  const element = $(selector);
  if (element) element.style.width = `${clampPercent(value)}%`;
}

function renderPrime() {
  const items = Array.isArray(character.prime) ? character.prime : [];
  const done = items.filter((item) => item.done).length;
  const total = items.length || 10;
  const percent = Math.round((done / total) * 100);

  setText('#primeCountMini', `${done}/${total}`);
  setText('#primeCountMenu', `${done}/${total}`);
  setText('#primeFullCount', `${done}/${total} điều kiện`);
  setText('#primeProgressText', `${percent}%`);
  setBar('#primeProgressBar', percent);

  const mini = $('#primeMiniList');
  const menu = $('#primeMenuList');
  const full = $('#primeFullList');

  if (mini) {
    mini.innerHTML = items.slice(0, 7).map((item) =>
      `<div class="prime-mini-item ${item.done ? 'done' : ''}"><i>${item.done ? '✓' : '•'}</i><span>${item.label}</span></div>`
    ).join('');
  }

  const markup = items.map((item) =>
    `<div class="prime-menu-item ${item.done ? 'done' : ''}"><i>${item.done ? '✓' : '•'}</i><span>${item.label}</span></div>`
  ).join('');
  if (menu) menu.innerHTML = markup;

  if (full) {
    full.innerHTML = items.map((item) =>
      `<div class="prime-full-item ${item.done ? 'done' : ''}"><i>${item.done ? '✓' : '•'}</i><span>${item.label}</span></div>`
    ).join('');
  }
}

function renderCharacter() {
  const name = character.name || 'Khủng long';
  const stage = character.stage || 'Đang sinh tồn';
  const growth = clampPercent(character.growth);
  const health = clampPercent(character.health);
  const stamina = clampPercent(character.stamina);
  const hunger = clampPercent(character.hunger);
  const thirst = clampPercent(character.thirst);

  setText('#dinoNameMini', name);
  setText('#dinoNameMenu', name);
  setText('#profileInitial', name.trim().charAt(0).toUpperCase() || 'D');
  setText('#stageMenu', stage);
  setText('#growthMini', `${growth}%`);
  setText('#menuDinoSummary', `${name} · ${growth}%`);

  const values = [
    ['health', health],
    ['stamina', stamina],
    ['hunger', hunger],
    ['thirst', thirst],
    ['growth', growth]
  ];

  for (const [key, value] of values) {
    setText(`#${key}Text`, `${value}%`);
    setText(`#${key}Menu`, `${value}%`);
    setBar(`#${key}Bar`, value);
    setBar(`#${key}MenuBar`, value);
  }

  renderPrime();
}

function renderRuntime() {
  const server = runtimeContext.server || {};
  const game = runtimeContext.game || {};
  const hud = runtimeContext.hud || {};

  const maxPlayers = Number(server.maxPlayers || 300);
  const players = server.online ? Number(server.players || 0) : '--';
  const ping = server.online && server.ping != null ? `${server.ping} ms` : '-- ms';
  const mapName = server.map || 'Gateway';
  const serverName = server.name || 'Dino Community';

  setText('#serverPlayers', `${players} / ${maxPlayers}`);
  setText('#serverPing', ping);
  setText('#mapName', mapName);
  setText('#largeMapName', mapName);
  setText('#serverNameMenu', serverName);
  setText('#gameProcess', game.running ? 'THE ISLE · ĐANG CHƠI' : 'THE ISLE');
  setText('#processMenu', game.running ? 'Đang chơi' : 'Chờ game');
  setText('#hudVersion', `HUD v${hud.version || '0.1.0'}`);

  const serverState = $('#serverState');
  if (serverState) {
    serverState.textContent = server.online ? 'SERVER ONLINE' : (server.configured ? 'SERVER OFFLINE' : 'SERVER');
    serverState.classList.toggle('online', Boolean(server.online));
  }

  if (runtimeContext.character && typeof runtimeContext.character === 'object') {
    character = {
      ...DEFAULT_CHARACTER,
      ...runtimeContext.character,
      nutrition: { ...DEFAULT_CHARACTER.nutrition, ...(runtimeContext.character.nutrition || {}) },
      prime: Array.isArray(runtimeContext.character.prime) ? runtimeContext.character.prime : DEFAULT_CHARACTER.prime
    };
  }

  renderCharacter();
}

function setMenu(open) {
  menuOpen = Boolean(open);
  const shell = $('#menuShell');
  if (!shell) return;
  shell.classList.toggle('open', menuOpen);
  shell.setAttribute('aria-hidden', menuOpen ? 'false' : 'true');
}

function switchTab(tab) {
  $$('.menu-tabs button').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  $$('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tab));
}

$$('.menu-tabs button').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
$('#closeMenuBtn')?.addEventListener('click', () => window.dinoHud?.closeMenu());
$('#hideHudBtn')?.addEventListener('click', () => window.dinoHud?.toggleHud());

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuOpen) window.dinoHud?.closeMenu();
});

window.dinoHud?.onContext((next) => {
  runtimeContext = next || {};
  renderRuntime();
});
window.dinoHud?.onMenu(({ open }) => setMenu(open));
window.dinoHud?.onVisibility(({ visible }) => {
  document.body.style.opacity = visible ? '1' : '0';
});

renderCharacter();
setTimeout(() => {
  const hint = $('#hotkeyHint');
  if (hint) hint.style.opacity = '.35';
}, 7000);
