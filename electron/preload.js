const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),

  onMaximized: (callback) => ipcRenderer.on('window:maximized', (_event, value) => callback(value)),
  onGameStatus: (callback) => ipcRenderer.on('game:status', (_event, value) => callback(value)),
  onServerStatus: (callback) => ipcRenderer.on('server:status', (_event, value) => callback(value)),
  onUpdaterStatus: (callback) => ipcRenderer.on('updater:status', (_event, value) => callback(value)),

  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPublicConfig: () => ipcRenderer.invoke('config:get-public'),
  openConfig: () => ipcRenderer.invoke('config:open'),

  getGameStatus: () => ipcRenderer.invoke('game:get-status'),
  detectGame: () => ipcRenderer.invoke('game:detect'),
  launchGame: () => ipcRenderer.invoke('game:launch'),

  queryServer: () => ipcRenderer.invoke('server:query'),

  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  openExternal: (url) => ipcRenderer.invoke('external:open', url)
});
