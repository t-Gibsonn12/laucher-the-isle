const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { loadConfig } = require('./services/config-service');
const { GameService } = require('./services/game-service');
const { ServerService } = require('./services/server-service');
const { UpdaterService } = require('./services/updater-service');

let mainWindow;
let config;
let configPath;
let gameService;
let serverService;
let updaterService;

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function reloadRuntimeConfig() {
  const loaded = loadConfig();
  config = loaded.config;
  configPath = loaded.userPath;

  if (serverService) serverService.config = config.server || {};
  if (gameService) gameService.config = config.game || {};
  if (updaterService) updaterService.config = config.updater || {};

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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () => send('window:maximized', true));
  mainWindow.on('unmaximize', () => send('window:maximized', false));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startCoreServices() {
  gameService = new GameService(config.game || {}, (status) => send('game:status', status));
  serverService = new ServerService(config.server || {}, (status) => send('server:status', status));
  updaterService = new UpdaterService(config.updater || {}, (status) => send('updater:status', status));

  gameService.start();
  serverService.start();
  updaterService.init();
  updaterService.scheduleAutoCheck();
}

app.whenReady().then(() => {
  reloadRuntimeConfig();

  createWindow();
  startCoreServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  gameService?.stop();
  serverService?.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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
    serverConfigured: Boolean(config?.server?.host),
    serverHost: config?.server?.host || '',
    serverPort: config?.server?.port || 7777,
    queryPort: config?.server?.queryPort || null
  };
});
ipcMain.handle('config:open', async () => {
  if (!configPath) reloadRuntimeConfig();
  if (!configPath) return false;
  const error = await shell.openPath(configPath);
  if (error) throw new Error(error);
  return true;
});

ipcMain.handle('game:get-status', () => gameService?.getStatus() || { installed: false, running: false });
ipcMain.handle('game:detect', () => gameService?.emitStatus({ refreshInstallation: true }));
ipcMain.handle('game:launch', async () => {
  reloadRuntimeConfig();
  const status = await gameService?.getStatus({ refreshInstallation: true });
  if (status?.running) return { ok: true, alreadyRunning: true, status };

  const appId = String(config?.game?.steamAppId || '376210');
  await shell.openExternal(`steam://run/${appId}`);
  return { ok: true, alreadyRunning: false, status };
});

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
