const { contextBridge, ipcRenderer } = require('electron');

const PREFIX = 'hud-upstream:';
const invoke = (name, ...args) => ipcRenderer.invoke(`${PREFIX}${name}`, ...args);
const listen = (name, callback) => {
  const channel = `${PREFIX}${name}`;
  const handler = (_event, value) => callback(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};
const noopListener = () => () => {};

contextBridge.exposeInMainWorld('isleOverlay', {
  getSettings: () => invoke('getSettings'),
  setSettings: (next) => invoke('setSettings', next),

  getState: () => invoke('getState'),
  setMouseIgnore: (ignore) => invoke('setMouseIgnore', ignore),
  onState: (cb) => listen('state', cb),
  quit: () => invoke('quit'),

  steamLogin: () => invoke('steamLogin'),
  getAuth: () => invoke('getAuth'),
  logout: () => invoke('logout'),
  onAuthChanged: (cb) => listen('auth', cb),

  apiGet: (pathname) => invoke('apiGet', pathname),
  apiPost: (pathname, body) => invoke('apiPost', pathname, body),
  apiGetFile: (pathname) => invoke('apiGetFile', pathname),
  getMapCatalog: () => invoke('getMapCatalog'),

  onLive: (cb) => listen('live', cb),
  onTicket: noopListener,
  onTroll: noopListener,
  onTrollAudio: noopListener,

  sendLiveSkin: (state) => invoke('sendLiveSkin', state),
  recordCursorKey: () => invoke('recordCursorKey'),
  recordDashKey: () => invoke('recordDashKey'),
  setDashOpen: (open) => invoke('setDashOpen', open),
  onDash: (cb) => listen('dash', cb),
  onCursor: (cb) => listen('cursor', cb),
  onBlocked: (cb) => listen('blocked', cb),
  onSettingsChanged: (cb) => listen('settings', cb),

  radarToggle: () => invoke('radarToggle'),
  radarClose: () => invoke('radarClose'),
  radarIsOpen: () => invoke('radarIsOpen'),
  radarGetBounds: () => invoke('radarGetBounds'),
  radarSetBounds: (bounds) => invoke('radarSetBounds', bounds),
  onRadarChanged: noopListener,

  voiceGetSettings: () => invoke('voiceGetSettings'),
  voiceSetSettings: (next) => invoke('voiceSetSettings', next),
  voiceGetState: () => invoke('voiceGetState'),
  voicePrepare: () => invoke('voicePrepare'),
  voiceInstallPlugin: () => invoke('voiceInstallPlugin'),
  voiceStart: () => invoke('voiceStart'),
  voiceStop: () => invoke('voiceStop'),
  voiceRecordPttKey: () => invoke('voiceRecordPttKey'),
  voiceOpenPluginFolder: () => invoke('voiceOpenPluginFolder'),
  onVoiceState: noopListener,

  updaterRestart: () => invoke('updaterRestart'),
  updaterCheck: () => invoke('updaterCheck'),
  updaterGetState: () => invoke('updaterGetState'),
  onUpdaterEvent: noopListener
});
