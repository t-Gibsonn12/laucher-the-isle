const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dinoHud', {
  onContext: (callback) => ipcRenderer.on('hud:context', (_event, value) => callback(value)),
  onMenu: (callback) => ipcRenderer.on('hud:menu', (_event, value) => callback(value)),
  onVisibility: (callback) => ipcRenderer.on('hud:visibility', (_event, value) => callback(value)),
  closeMenu: () => ipcRenderer.send('dino-hud:close-menu'),
  toggleHud: () => ipcRenderer.send('dino-hud:toggle-hud')
});
