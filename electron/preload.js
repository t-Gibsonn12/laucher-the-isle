const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  onMaximized: (callback) => ipcRenderer.on('window:maximized', (_event, value) => callback(value)),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  launchGame: () => ipcRenderer.invoke('game:launch'),
  openExternal: (url) => ipcRenderer.invoke('external:open', url)
});
