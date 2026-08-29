const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { loadConfig, saveConfig } = require('./services/config-service');
const { GameService } = require('./services/game-service');
const { ServerService } = require('./services/server-service');
const { UpdaterService } = require('./services/updater-service');
const { LoggerService } = require('./services/logger-service');
const { ModuleManager } = require('./services/module-manager');
const { TrayService } = require('./services/tray-service');

let mainWindow;
let config;
let configPath;
let logsPath;
let gameService;
let serverService;
let updaterService;
let moduleManager;
let trayService;
let loggerService;
let launcherLog;
let gameLog;
let serverLog;
let updaterLog;
let moduleLog;
let isQuitting = false;
let gameStatusSeen = false;
let lastGameRunning = false;
let latestServerStatus = null;

const RUNTIME_KEYS = new Set([
  'closeToTray',
  'minimizeOnGameStart',
  'restoreOnGameExit',
  'startWithWindows'
]);

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
}

app.on('second-instance', () => {
  if (app.isReady()) showMainWindow();
  else app.whenReady().then(showMainWindow);
});

function persistConfig() {
  try {
    configPath = saveConfig(config);
    return true;
  } catch (error) {
    launcherLog?.error('Failed to save launcher config', { message: error.message });
    return false;
  }
}

function applyRuntimeSettings() {
  const runtime = config?.runtime || {};
  if (process.platform === 'win32' && app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: Boolean(runtime.startWithWindows),
      path: process.execPath
    });
  }
}

function reloadRuntimeConfig() {
  const loaded = loadConfig();
  config = loaded.config;
  configPath = loaded.userPath;

  if (serverService) serverService.config = config.server || {};
  if (gameService) gameService.config = config.game || {};
  if (updaterService) updaterService.config = config.updater || {};
  if (moduleManager) moduleManager.updateConfig(config.modules || {});
  applyRuntimeSettings();
  return loaded;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1680,
    height: 944,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    frame: false,
    backgroundColor: '#020705',
    title: 'Dino Community — The Isle Launcher',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('maximize', () => send('window:maximized', true));
  mainWindow.on('unmaximize', () => send('window:maximized', false));
  mainWindow.on('close', (event) => {
    if (isQuitting || config?.runtime?.closeToTray === false) return;

    if (trayService?.isReady?.()) {
      event.preventDefault();
      hideMainWindow();
      trayService.notifyHidden?.();
      launcherLog?.info('Launcher hidden to system tray');
      return;
    }

    launcherLog?.warn('Close-to-tray skipped because tray is unavailable');
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function handleGameStatus(status) {
  send('game:status', status);
  trayService?.setGameStatus(status);
  moduleManager?.updateContext({ game: status });
  await moduleManager?.reconcile(Boolean(status?.running));

  if (!gameStatusSeen) {
    gameStatusSeen = true;
    lastGameRunning = Boolean(status?.running);
    gameLog?.info('Initial game status', status);
    return;
  }

  const running = Boolean(status?.running);
  if (running !== lastGameRunning) {
    gameLog?.info(running ? 'The Isle process started' : 'The Isle process stopped', status);

    if (running && config?.runtime?.minimizeOnGameStart) {
      if (trayService?.isReady?.()) {
        setTimeout(() => {
          hideMainWindow();
          trayService.notifyHidden?.();
        }, 700);
      } else {
        launcherLog?.warn('Auto-hide on game start skipped because tray is unavailable');
      }
    }

    if (!running && config?.runtime?.restoreOnGameExit) {
      showMainWindow();
    }
  }

  lastGameRunning = running;
}

function startCoreServices() {
  moduleManager = new ModuleManager({
    appRoot: app.getAppPath(),
    config: config.modules || {},
    logger: moduleLog,
    context: {
      launcher: { version: app.getVersion(), packaged: app.isPackaged },
      game: null,
      server: latestServerStatus
    },
    onStatus: (modules) => {
      send('modules:status', modules);
      trayService?.setModules(modules);
    },
    onConfigChange: (modulesConfig) => {
      config.modules = modulesConfig;
      persistConfig();
    }
  });
  moduleManager.init();

  gameService = new GameService(config.game || {}, (status) => handleGameStatus(status));
  serverService = new ServerService(config.server || {}, (status) => {
    latestServerStatus = status;
    send('server:status', status);
    moduleManager?.updateContext({ server: status });
    if (status?.configured) serverLog?.info(status.online ? 'Server query online' : 'Server query offline', status);
  });
  updaterService = new UpdaterService(config.updater || {}, (status) => {
    send('updater:status', status);
    moduleManager?.updateContext({ updater: status });
    if (status?.status === 'error') updaterLog?.error('Updater error', status);
    else if (['available', 'downloaded'].includes(status?.status)) updaterLog?.info(`Updater ${status.status}`, status);
  });

  gameService.start();
  serverService.start();
  updaterService.init();
  updaterService.scheduleAutoCheck();
}

async function launchGameInternal() {
  reloadRuntimeConfig();
  const status = await gameService?.getStatus({ refreshInstallation: true });
  if (status?.running) return { ok: true, alreadyRunning: true, status };

  const appId = String(config?.game?.steamAppId || '376210');
  gameLog?.info('Launching The Isle through Steam', { appId, detected: Boolean(status?.installed), installPath: status?.installPath || null });
  await shell.openExternal(`steam://run/${appId}`);
  return { ok: true, alreadyRunning: false, status };
}

function initializeTray() {
  trayService = new TrayService({
    logger: launcherLog,
    onShow: showMainWindow,
    onHide: hideMainWindow,
    onLaunchGame: () => launchGameInternal().catch((error) => launcherLog?.error('Tray game launch failed', { message: error.message })),
    onToggleModule: (id, enabled) => moduleManager?.setEnabled(id, enabled),
    onQuit: () => {
      isQuitting = true;
      app.quit();
    }
  });

  try {
    trayService.init();
  } catch (error) {
    launcherLog?.error('System tray disabled for this run', { message: error.message });
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('vn.dinocommunity.launcher');
  logsPath = path.join(app.getPath('userData'), 'logs');
  loggerService = new LoggerService(logsPath);
  launcherLog = loggerService.child('launcher');
  gameLog = loggerService.child('game-monitor');
  serverLog = loggerService.child('server');
  updaterLog = loggerService.child('updater');
  moduleLog = loggerService.child('modules');

  reloadRuntimeConfig();
  launcherLog.info('Launcher starting', { version: app.getVersion(), packaged: app.isPackaged });

  createWindow();
  initializeTray();
  startCoreServices();

  app.on('activate', () => showMainWindow());
});

app.on('before-quit', async () => {
  isQuitting = true;
  gameService?.stop();
  serverService?.stop();
  await moduleManager?.shutdown();
  trayService?.destroy();
  launcherLog?.info('Launcher stopped');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && (isQuitting || config?.runtime?.closeToTray === false)) app.quit();
});

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:toggle-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('config:get-public', () => {
  reloadRuntimeConfig();
  return {
    path: configPath,
    logsPath,
    serverConfigured: Boolean(config?.server?.host),
    serverHost: config?.server?.host || '',
    serverPort: config?.server?.port || 7777,
    queryPort: config?.server?.queryPort || null,
    runtime: { ...(config?.runtime || {}) }
  };
});
ipcMain.handle('config:open', async () => {
  if (!configPath) reloadRuntimeConfig();
  if (!configPath) return false;
  const error = await shell.openPath(configPath);
  if (error) throw new Error(error);
  return true;
});
ipcMain.handle('logs:open', async () => {
  if (!logsPath) return false;
  const error = await shell.openPath(logsPath);
  if (error) throw new Error(error);
  return true;
});

ipcMain.handle('settings:get', async () => ({
  runtime: { ...(config?.runtime || {}) },
  modules: moduleManager?.getSnapshot() || [],
  game: await gameService?.getStatus(),
  configPath,
  logsPath,
  packaged: app.isPackaged
}));
ipcMain.handle('settings:set-runtime', (_event, key, value) => {
  if (!RUNTIME_KEYS.has(key)) throw new Error(`Unsupported runtime setting: ${key}`);
  config.runtime = { ...(config.runtime || {}), [key]: Boolean(value) };
  persistConfig();
  applyRuntimeSettings();
  launcherLog?.info('Runtime setting changed', { key, value: Boolean(value) });
  return { ...(config.runtime || {}) };
});

ipcMain.handle('modules:get', () => moduleManager?.getSnapshot() || []);
ipcMain.handle('modules:set-enabled', (_event, id, enabled) => moduleManager?.setEnabled(id, enabled));
ipcMain.handle('modules:set-autostart', (_event, id, enabled) => moduleManager?.setAutoStart(id, enabled));

ipcMain.handle('game:get-status', () => gameService?.getStatus() || { installed: false, running: false });
ipcMain.handle('game:detect', () => gameService?.emitStatus({ refreshInstallation: true }));
ipcMain.handle('game:launch', () => launchGameInternal());

ipcMain.handle('server:query', () => {
  reloadRuntimeConfig();
  return serverService?.query();
});

ipcMain.handle('updater:check', () => updaterService?.check());
ipcMain.handle('updater:download', () => updaterService?.download());
ipcMain.handle('updater:install', () => updaterService?.install());

ipcMain.handle('external:open', async (_event, url) => {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
  await shell.openExternal(parsed.toString());
  return true;
});
