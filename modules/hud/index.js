const path = require('path');
const { BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');

const version = '0.1.0';
const MENU_HOTKEY = 'F7';
const HUD_HOTKEY = 'F8';
const CHANNEL_CLOSE_MENU = 'dino-hud:close-menu';
const CHANNEL_TOGGLE_HUD = 'dino-hud:toggle-hud';

function create({ logger, getContext } = {}) {
  let overlay = null;
  let menuOpen = false;
  let hudVisible = true;
  let context = getContext?.() || {};
  let started = false;

  const log = {
    info: (message, data) => logger?.info?.(`[HUD] ${message}`, data),
    warn: (message, data) => logger?.warn?.(`[HUD] ${message}`, data),
    error: (message, data) => logger?.error?.(`[HUD] ${message}`, data)
  };

  function activeDisplay() {
    return screen.getPrimaryDisplay();
  }

  function syncBounds() {
    if (!overlay || overlay.isDestroyed()) return;
    const { x, y, width, height } = activeDisplay().bounds;
    overlay.setBounds({ x, y, width, height }, false);
  }

  function pushContext() {
    if (!overlay || overlay.isDestroyed() || overlay.webContents.isLoading()) return;
    overlay.webContents.send('hud:context', {
      ...context,
      hud: {
        menuHotkey: MENU_HOTKEY,
        hudHotkey: HUD_HOTKEY,
        menuOpen,
        visible: hudVisible,
        version
      }
    });
  }

  function setInteractionMode(interactive) {
    if (!overlay || overlay.isDestroyed()) return;
    overlay.setIgnoreMouseEvents(!interactive, { forward: true });
  }

  function setMenuOpen(next) {
    menuOpen = Boolean(next) && hudVisible;
    if (!overlay || overlay.isDestroyed()) return;
    setInteractionMode(menuOpen);
    if (hudVisible && !overlay.isVisible()) overlay.showInactive();
    overlay.webContents.send('hud:menu', { open: menuOpen });
    pushContext();
  }

  function toggleMenu() {
    if (!hudVisible) {
      hudVisible = true;
      overlay?.showInactive();
    }
    setMenuOpen(!menuOpen);
  }

  function toggleHud() {
    hudVisible = !hudVisible;
    menuOpen = false;
    if (!overlay || overlay.isDestroyed()) return;

    if (hudVisible) {
      overlay.showInactive();
      setInteractionMode(false);
    } else {
      overlay.hide();
    }
    overlay.webContents.send('hud:visibility', { visible: hudVisible });
    overlay.webContents.send('hud:menu', { open: false });
    pushContext();
  }

  function onCloseMenu() {
    setMenuOpen(false);
  }

  function onToggleHud() {
    toggleHud();
  }

  function registerHotkeys() {
    const menuRegistered = globalShortcut.register(MENU_HOTKEY, toggleMenu);
    const hudRegistered = globalShortcut.register(HUD_HOTKEY, toggleHud);
    if (!menuRegistered) log.warn(`Không đăng ký được hotkey ${MENU_HOTKEY}`);
    if (!hudRegistered) log.warn(`Không đăng ký được hotkey ${HUD_HOTKEY}`);
  }

  function unregisterHotkeys() {
    globalShortcut.unregister(MENU_HOTKEY);
    globalShortcut.unregister(HUD_HOTKEY);
  }

  function createOverlayWindow() {
    const display = activeDisplay();
    const { x, y, width, height } = display.bounds;

    overlay = new BrowserWindow({
      x,
      y,
      width,
      height,
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
      title: 'Dino Community HUD',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    overlay.setMenuBarVisibility(false);
    overlay.setAlwaysOnTop(true, 'screen-saver');
    overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlay.setIgnoreMouseEvents(true, { forward: true });

    overlay.loadFile(path.join(__dirname, 'overlay.html'));
    overlay.webContents.once('did-finish-load', () => {
      pushContext();
      overlay.webContents.send('hud:menu', { open: false });
      overlay.webContents.send('hud:visibility', { visible: true });
      overlay.showInactive();
      log.info('HUD overlay ready', { width, height, menuHotkey: MENU_HOTKEY, hudHotkey: HUD_HOTKEY });
    });

    overlay.on('closed', () => {
      overlay = null;
    });
  }

  async function start({ context: startContext } = {}) {
    if (started && overlay && !overlay.isDestroyed()) return;
    started = true;
    context = startContext || getContext?.() || context || {};
    hudVisible = true;
    menuOpen = false;

    createOverlayWindow();
    screen.on('display-metrics-changed', syncBounds);
    screen.on('display-added', syncBounds);
    screen.on('display-removed', syncBounds);
    ipcMain.on(CHANNEL_CLOSE_MENU, onCloseMenu);
    ipcMain.on(CHANNEL_TOGGLE_HUD, onToggleHud);
    registerHotkeys();
  }

  async function stop() {
    if (!started) return;
    started = false;
    menuOpen = false;
    unregisterHotkeys();
    ipcMain.removeListener(CHANNEL_CLOSE_MENU, onCloseMenu);
    ipcMain.removeListener(CHANNEL_TOGGLE_HUD, onToggleHud);
    screen.removeListener('display-metrics-changed', syncBounds);
    screen.removeListener('display-added', syncBounds);
    screen.removeListener('display-removed', syncBounds);

    if (overlay && !overlay.isDestroyed()) overlay.destroy();
    overlay = null;
    log.info('HUD overlay stopped');
  }

  function updateContext(nextContext = {}) {
    context = { ...context, ...nextContext };
    pushContext();
  }

  return {
    start,
    stop,
    updateContext,
    toggleMenu,
    toggleHud
  };
}

module.exports = { version, create };
