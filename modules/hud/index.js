const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const { isGameRunning, mapSnapshot, playerPosition } = require('./runtime-state');

const version = '0.4.1-upstream';
const DASH_HOTKEY = 'F8';
const HIDE_HOTKEY = 'F9';
const PREFIX = 'hud-upstream:';

function create({ logger, appRoot, getContext } = {}) {
  let overlay = null;
  let started = false;
  let visible = true;
  let dashOpen = false;
  let context = getContext?.() || {};
  let settings = null;
  let settingsPath = null;
  let keepTopTimer = null;
  let lastGameRunning = null;
  let rendererMode = 'upstream';
  let lastRendererHeartbeat = 0;
  let fallbackRequested = false;
  const registeredHandlers = [];
  const registeredListeners = [];

  const writeConsole = (level, message, data) => {
    const suffix = data ? ` ${JSON.stringify(data)}` : '';
    const line = `[HUD upstream] ${message}${suffix}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };

  const log = {
    info: (message, data) => {
      writeConsole('info', message, data);
      logger?.info?.(`[HUD upstream] ${message}`, data);
    },
    warn: (message, data) => {
      writeConsole('warn', message, data);
      logger?.warn?.(`[HUD upstream] ${message}`, data);
    },
    error: (message, data) => {
      writeConsole('error', message, data);
      logger?.error?.(`[HUD upstream] ${message}`, data);
    }
  };

  function getDefaultSettings() {
    return {
      apiBaseUrl: 'https://yeti2.islepilot.eu',
      steamId: '76561198000000000',
      overlayToken: 'dino-launcher-upstream',
      opacity: 1,
      layout: null,
      panels: { stats: true, prime: true, heart: false, radar: true },
      theme: {
        accent: '#7cf2a6',
        stat: { health: '#ff5a5a', stamina: '#35d6a4', food: '#ffb454', water: '#5ab6ff' }
      },
      radarBounds: null,
      radarSize: 240,
      radarRange: 1,
      radarLabels: true,
      radarOpen: true,
      cursorEnabled: true,
      cursorKey: 'Insert',
      cursorMode: 'toggle',
      dashKey: DASH_HOTKEY,
      streamerMode: false,
      compatMode: false
    };
  }

  function loadSettings() {
    settingsPath = path.join(app.getPath('userData'), 'hud-upstream.settings.json');
    const defaults = getDefaultSettings();
    try {
      if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, `${JSON.stringify(defaults, null, 2)}\n`, 'utf8');
        return defaults;
      }
      const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return { ...defaults, ...(parsed || {}), panels: { ...defaults.panels, ...(parsed?.panels || {}) } };
    } catch (error) {
      log.warn('Không đọc được HUD settings, dùng mặc định', { message: error.message });
      return defaults;
    }
  }

  function saveSettings(next) {
    settings = { ...settings, ...(next || {}) };
    if (next?.panels) settings.panels = { ...(settings.panels || {}), ...next.panels };
    try {
      fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    } catch (error) {
      log.warn('Không lưu được HUD settings', { message: error.message });
    }
    send('settings', settings);
    return settings;
  }

  function upstreamCandidates() {
    const cwd = process.cwd();
    return [
      process.env.DINO_ISLE_OVERLAY_DIST && path.resolve(process.env.DINO_ISLE_OVERLAY_DIST, 'index.html'),
      path.join(__dirname, 'upstream-dist', 'index.html'),
      path.join(appRoot || cwd, 'modules', 'hud', 'upstream-dist', 'index.html'),
      path.join(cwd, '.cache', 'isle-overlay-main', 'dist', 'index.html'),
      path.join(cwd, '..', 'isle-overlay-main', 'dist', 'index.html')
    ].filter(Boolean);
  }

  function resolveFallbackIndex() {
    const candidate = path.join(__dirname, 'fallback.html');
    return fs.existsSync(candidate) ? candidate : null;
  }

  function resolveUpstreamIndex() {
    return upstreamCandidates().find((candidate) => fs.existsSync(candidate)) || null;
  }

  function stateSnapshot() {
    return {
      gameDetected: isGameRunning(context),
      active: started,
      focused: isGameRunning(context)
    };
  }

  function percent(value, fallback = 100) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, n));
  }

  function playerSnapshot() {
    const c = context.character || {};
    const growthPct = percent(c.growth, 96);
    const healthPct = percent(c.health, 100);
    const staminaPct = percent(c.stamina, 82);
    const hungerPct = percent(c.hunger, 76);
    const thirstPct = percent(c.thirst, 88);
    const primeItems = Array.isArray(c.prime)
      ? c.prime
      : [
          { label: 'Đến Thánh địa khi còn thiếu niên', done: true },
          { label: 'Được sinh ra từ tổ', done: true },
          { label: 'Đạt chế độ ăn hoàn hảo', done: true },
          { label: 'Đến vùng Di cư lớn', done: true },
          { label: 'Đến 2 vùng Di cư', done: true },
          { label: 'Đến 4 vùng Tuần tra', done: true },
          { label: 'Không bao giờ bị vô sinh', done: true },
          { label: 'Không bao giờ bị co thắt cơ', done: true },
          { label: 'Sống sót đến khi trưởng thành', done: false },
          { label: 'Hoàn thành một lượt tuần tra', done: false }
        ];
    const quests = primeItems.map((item) => ({ name: item.name || item.label || 'Điều kiện Prime', done: Boolean(item.done) }));
    const done = quests.filter((item) => item.done).length;
    const nutrition = c.nutrition || {};

    return {
      hasData: true,
      steamId: settings?.steamId || '76561198000000000',
      name: c.playerName || 'Dino Community',
      server: context.server?.name || 'Dino Community',
      online: isGameRunning(context),
      species: c.name || c.species || 'Triceratops',
      female: Boolean(c.female),
      growth: growthPct / 100,
      health: healthPct,
      maxHealth: 100,
      hunger: hungerPct,
      maxHunger: 100,
      thirst: thirstPct,
      maxThirst: 100,
      stamina: staminaPct,
      maxStamina: 100,
      nutrition: {
        carb: Number(nutrition.carb ?? nutrition.carbs ?? 570.7),
        protein: Number(nutrition.protein ?? 354),
        lipid: Number(nutrition.lipid ?? nutrition.fat ?? 874.1)
      },
      prime: {
        eligible: done >= 5,
        elder: String(c.stage || '').toLowerCase().includes('prime elder'),
        required: 5,
        total: quests.length,
        done,
        quests
      }
    };
  }

  function liveSnapshot() {
    const me = playerSnapshot();
    const position = playerPosition(context);
    return {
      steamId: me.steamId,
      hasDino: isGameRunning(context),
      growth: me.growth,
      health: me.health,
      maxHealth: me.maxHealth,
      hunger: me.hunger,
      maxHunger: me.maxHunger,
      thirst: me.thirst,
      maxThirst: me.maxThirst,
      stamina: me.stamina,
      maxStamina: me.maxStamina,
      nutrition: me.nutrition,
      position
    };
  }

  function apiGet(pathname) {
    if (pathname === '/api/overlay/me') return playerSnapshot();
    if (pathname === '/api/overlay/tickets/summary') return { unreadTickets: 0, hasUrgent: false, staff: { assignedUnread: 0 } };
    if (pathname === '/api/overlay/mapedit/access') return { admin: false };
    if (pathname === '/api/overlay/admin/access') return { enabled: false };
    if (pathname === '/api/overlay/garage') return { settings: {}, dinos: [] };
    if (pathname === '/api/overlay/shop') return { skins: [], dinos: [], owned: [], balance: 0, currencyName: 'xu' };
    if (pathname === '/api/overlay/tickets') return { tickets: [] };
    if (pathname === '/api/overlay/map') {
      return mapSnapshot(context, settings?.steamId);
    }
    return {};
  }

  function send(name, payload) {
    if (!overlay || overlay.isDestroyed() || overlay.webContents.isLoading()) return;
    overlay.webContents.send(`${PREFIX}${name}`, payload);
  }

  function setMouseIgnore(ignore) {
    if (!overlay || overlay.isDestroyed()) return false;
    overlay.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
    return true;
  }

  function setDashOpen(next) {
    dashOpen = Boolean(next);
    if (overlay && !overlay.isDestroyed()) {
      if (dashOpen && !overlay.isVisible()) overlay.showInactive();
      setMouseIgnore(!dashOpen);
      if (dashOpen) {
        overlay.setAlwaysOnTop(true, 'screen-saver');
        overlay.moveTop();
        overlay.focus();
      }
      send('dash', dashOpen);
      send('cursor', dashOpen);
      log.info(`Dashboard ${dashOpen ? 'ON' : 'OFF'} (${DASH_HOTKEY})`);
    }
    return dashOpen;
  }

  function toggleDash() {
    if (!visible) {
      visible = true;
      overlay?.showInactive();
    }
    setDashOpen(!dashOpen);
  }

  function toggleVisibility() {
    visible = !visible;
    dashOpen = false;
    if (!overlay || overlay.isDestroyed()) return visible;
    if (visible) {
      overlay.showInactive();
      overlay.setAlwaysOnTop(true, 'screen-saver');
      overlay.moveTop();
      setMouseIgnore(true);
    } else {
      overlay.hide();
    }
    send('dash', false);
    send('cursor', false);
    log.info(`HUD ${visible ? 'VISIBLE' : 'HIDDEN'} (${HIDE_HOTKEY})`);
    return visible;
  }

  function registerHandle(channel, handler) {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, handler);
    registeredHandlers.push(channel);
  }

  function registerListener(channel, handler) {
    ipcMain.removeAllListeners(channel);
    ipcMain.on(channel, handler);
    registeredListeners.push([channel, handler]);
  }

  function registerBridge() {
    registerHandle(`${PREFIX}getSettings`, () => settings);
    registerHandle(`${PREFIX}setSettings`, (_event, next) => saveSettings(next));
    registerHandle(`${PREFIX}getState`, () => stateSnapshot());
    registerHandle(`${PREFIX}setMouseIgnore`, (_event, ignore) => setMouseIgnore(ignore));
    registerHandle(`${PREFIX}quit`, () => toggleVisibility());
    registerHandle(`${PREFIX}getAuth`, () => ({ steamId: settings.steamId, authed: true }));
    registerHandle(`${PREFIX}steamLogin`, () => ({ pending: false }));
    registerHandle(`${PREFIX}logout`, () => ({ ok: true }));
    registerHandle(`${PREFIX}apiGet`, (_event, pathname) => apiGet(pathname));
    registerHandle(`${PREFIX}apiPost`, () => ({ ok: true }));
    registerHandle(`${PREFIX}apiGetFile`, () => ({ error: 'Chưa kết nối file API.' }));
    registerHandle(`${PREFIX}getMapCatalog`, () => ({ meshes: [], blueprints: [] }));
    registerHandle(`${PREFIX}sendLiveSkin`, () => ({ ok: true }));
    registerHandle(`${PREFIX}recordCursorKey`, () => null);
    registerHandle(`${PREFIX}recordDashKey`, () => DASH_HOTKEY);
    registerHandle(`${PREFIX}setDashOpen`, (_event, open) => setDashOpen(open));
    registerHandle(`${PREFIX}radarToggle`, () => true);
    registerHandle(`${PREFIX}radarClose`, () => true);
    registerHandle(`${PREFIX}radarIsOpen`, () => true);
    registerHandle(`${PREFIX}radarGetBounds`, () => settings.radarBounds || null);
    registerHandle(`${PREFIX}radarSetBounds`, (_event, bounds) => { saveSettings({ radarBounds: bounds }); return true; });
    registerHandle(`${PREFIX}voiceGetSettings`, () => ({ enabled: false, autoStart: false, pttEnabled: true, pttKey: 'V' }));
    registerHandle(`${PREFIX}voiceSetSettings`, (_event, next) => next || {});
    registerHandle(`${PREFIX}voiceGetState`, () => ({ phase: 'disabled', running: false, configured: false }));
    registerHandle(`${PREFIX}voicePrepare`, () => ({ phase: 'disabled', running: false, configured: false }));
    registerHandle(`${PREFIX}voiceInstallPlugin`, () => ({ phase: 'disabled', running: false, configured: false }));
    registerHandle(`${PREFIX}voiceStart`, () => ({ phase: 'disabled', running: false, configured: false }));
    registerHandle(`${PREFIX}voiceStop`, () => ({ phase: 'disabled', running: false, configured: false }));
    registerHandle(`${PREFIX}voiceRecordPttKey`, () => 'V');
    registerHandle(`${PREFIX}voiceOpenPluginFolder`, () => '');
    registerHandle(`${PREFIX}updaterRestart`, () => false);
    registerHandle(`${PREFIX}updaterCheck`, () => false);
    registerHandle(`${PREFIX}updaterGetState`, () => ({ state: 'launcher-managed' }));
    registerListener(`${PREFIX}renderer-heartbeat`, () => {
      lastRendererHeartbeat = Date.now();
    });
  }

  function unregisterBridge() {
    for (const channel of registeredHandlers.splice(0)) ipcMain.removeHandler(channel);
    for (const [channel, handler] of registeredListeners.splice(0)) ipcMain.removeListener(channel, handler);
  }

  function activeDisplay() {
    return screen.getPrimaryDisplay();
  }

  function syncBounds() {
    if (!overlay || overlay.isDestroyed()) return;
    overlay.setBounds(activeDisplay().bounds, false);
  }

  function registerHotkeys() {
    const dashRegistered = globalShortcut.register(DASH_HOTKEY, toggleDash);
    const hideRegistered = globalShortcut.register(HIDE_HOTKEY, toggleVisibility);
    if (!dashRegistered) log.warn(`Không đăng ký được ${DASH_HOTKEY}`);
    if (!hideRegistered) log.warn(`Không đăng ký được ${HIDE_HOTKEY}`);
    log.info('Hotkey registration', { F8: dashRegistered, F9: hideRegistered });
  }

  function unregisterHotkeys() {
    globalShortcut.unregister(DASH_HOTKEY);
    globalShortcut.unregister(HIDE_HOTKEY);
  }

  function switchToFallback(reason) {
    if (fallbackRequested || rendererMode === 'fallback' || !overlay || overlay.isDestroyed()) return;
    const fallbackPath = resolveFallbackIndex();
    if (!fallbackPath) {
      log.error('Không tìm thấy HUD fallback', { reason });
      return;
    }

    fallbackRequested = true;
    rendererMode = 'fallback';
    lastRendererHeartbeat = Date.now();
    log.warn('HUD renderer không phản hồi, chuyển sang chế độ ổn định', { reason, fallbackPath });
    overlay.loadFile(fallbackPath).catch((error) => {
      log.error('Không thể mở HUD fallback', { reason, message: error.message, fallbackPath });
    });
  }

  function createOverlayWindow(indexPath) {
    const bounds = activeDisplay().bounds;
    overlay = new BrowserWindow({
      ...bounds,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      focusable: true,
      title: 'Dino Community HUD · upstream isle-overlay',
      webPreferences: {
        preload: path.join(__dirname, 'host-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false
      }
    });

    overlay.setMenuBarVisibility(false);
    overlay.setAlwaysOnTop(true, 'screen-saver');
    overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    setMouseIgnore(true);

    overlay.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      log.error('Renderer load failed', { errorCode, errorDescription, validatedURL });
    });
    overlay.webContents.on('render-process-gone', (_event, details) => {
      log.error('Renderer process gone', details);
      if (rendererMode === 'upstream') switchToFallback(`renderer-gone:${details?.reason || 'unknown'}`);
    });
    overlay.webContents.on('preload-error', (_event, preloadPath, error) => {
      log.error('Preload failed', { preloadPath, message: error?.message || String(error) });
    });
    overlay.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      if (message) log.info(`Renderer: ${message}`, { level, line, sourceId });
    });

    overlay.once('ready-to-show', () => {
      if (!overlay || overlay.isDestroyed() || !visible) return;
      overlay.showInactive();
      overlay.setAlwaysOnTop(true, 'screen-saver');
      overlay.moveTop();
      log.info('Overlay ready-to-show');
    });

    overlay.loadFile(indexPath).catch((error) => {
      log.error('loadFile failed', { message: error.message, indexPath });
    });

    overlay.webContents.on('did-finish-load', () => {
      lastRendererHeartbeat = Date.now();
      send('state', stateSnapshot());
      send('auth', { steamId: settings.steamId, authed: true });
      send('settings', settings);
      send('live', liveSnapshot());
      send('blocked', false);
      send('dash', false);
      send('cursor', false);
      if (visible) {
        overlay.showInactive();
        overlay.setAlwaysOnTop(true, 'screen-saver');
        overlay.moveTop();
      }
      log.info('Đã nạp HUD renderer', {
        mode: rendererMode,
        indexPath: rendererMode === 'fallback' ? resolveFallbackIndex() : indexPath,
        hotkey: DASH_HOTKEY
      });
    });

    overlay.on('unresponsive', () => {
      log.warn('Overlay window unresponsive', { mode: rendererMode });
      switchToFallback('unresponsive-event');
    });
    overlay.on('closed', () => { overlay = null; });
  }

  function keepOverlayOnTop() {
    if (!started || !visible || !overlay || overlay.isDestroyed()) return;
    syncBounds();
    if (!overlay.isVisible()) overlay.showInactive();
    overlay.setAlwaysOnTop(true, 'screen-saver');
    overlay.moveTop();
    if (rendererMode === 'upstream' && Date.now() - lastRendererHeartbeat > 8000) {
      switchToFallback('renderer-heartbeat-timeout');
    }
    send('state', stateSnapshot());
    send('live', liveSnapshot());
  }

  async function start({ context: startContext } = {}) {
    if (started && overlay && !overlay.isDestroyed()) return;
    context = startContext || getContext?.() || context || {};
    settings = loadSettings();
    const indexPath = resolveUpstreamIndex();
    if (!indexPath) {
      throw new Error('Không tìm thấy bản build HUD upstream. Chạy: npm run hud:prepare');
    }

    started = true;
    visible = true;
    dashOpen = false;
    rendererMode = 'upstream';
    fallbackRequested = false;
    lastRendererHeartbeat = Date.now();
    lastGameRunning = isGameRunning(context);
    log.info('Starting HUD module', {
      indexPath,
      gameRunning: lastGameRunning,
      selfMarkers: mapSnapshot(context, settings?.steamId).markers.length
    });
    registerBridge();
    registerHotkeys();
    createOverlayWindow(indexPath);
    screen.on('display-metrics-changed', syncBounds);
    screen.on('display-added', syncBounds);
    screen.on('display-removed', syncBounds);
    keepTopTimer = setInterval(keepOverlayOnTop, 1000);
  }

  async function stop() {
    if (!started) return;
    started = false;
    if (keepTopTimer) clearInterval(keepTopTimer);
    keepTopTimer = null;
    unregisterHotkeys();
    unregisterBridge();
    screen.removeListener('display-metrics-changed', syncBounds);
    screen.removeListener('display-added', syncBounds);
    screen.removeListener('display-removed', syncBounds);
    if (overlay && !overlay.isDestroyed()) overlay.destroy();
    overlay = null;
    log.info('HUD upstream đã dừng');
  }

  function updateContext(nextContext = {}) {
    context = { ...context, ...nextContext };
    const gameRunning = isGameRunning(context);
    if (gameRunning !== lastGameRunning) {
      const markerCount = mapSnapshot(context, settings?.steamId).markers.length;
      log.info('Gameplay visibility evidence changed', { gameRunning, selfMarkers: markerCount });
      lastGameRunning = gameRunning;
    }
    send('state', stateSnapshot());
    send('live', liveSnapshot());
  }

  return { start, stop, updateContext, toggleMenu: toggleDash, toggleHud: toggleVisibility };
}

module.exports = { version, create };
