const { contextBridge, ipcRenderer } = require('electron');

function on(channel, callback) {
  const handler = (_event, value) => callback(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('launcher', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),

  onMaximized: (callback) => on('window:maximized', callback),
  onGameStatus: (callback) => on('game:status', callback),
  onServerStatus: (callback) => on('server:status', callback),
  onUpdaterStatus: (callback) => on('updater:status', callback),
  onModulesStatus: (callback) => on('modules:status', callback),

  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPublicConfig: () => ipcRenderer.invoke('config:get-public'),
  openConfig: () => ipcRenderer.invoke('config:open'),
  openLogs: () => ipcRenderer.invoke('logs:open'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setRuntimeSetting: (key, value) => ipcRenderer.invoke('settings:set-runtime', key, value),

  getModules: () => ipcRenderer.invoke('modules:get'),
  setModuleEnabled: (id, enabled) => ipcRenderer.invoke('modules:set-enabled', id, enabled),
  setModuleAutoStart: (id, enabled) => ipcRenderer.invoke('modules:set-autostart', id, enabled),

  getGameStatus: () => ipcRenderer.invoke('game:get-status'),
  detectGame: () => ipcRenderer.invoke('game:detect'),
  launchGame: () => ipcRenderer.invoke('game:launch'),

  queryServer: () => ipcRenderer.invoke('server:query'),

  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  openExternal: (url) => ipcRenderer.invoke('external:open', url)
});
