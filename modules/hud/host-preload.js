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

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send(`${PREFIX}renderer-heartbeat`);
  window.setInterval(() => ipcRenderer.send(`${PREFIX}renderer-heartbeat`), 1000);
});

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

  // The original src treats an explicit hasDino=false live frame as authoritative
  // and locks gameplay widgets hidden for 12 seconds. Because this launcher keeps
  // the HUD renderer alive before The Isle starts, sending those idle frames here
  // caused a guaranteed hide window every time the player entered the game.
  // Outside The Isle the native foreground guard already hides the whole overlay,
  // so suppress only the synthetic pre-game false frames. Real/positive frames
  // still pass through unchanged and immediately trigger the original src checks.
  onLive: (cb) => listen('live', (frame) => {
    if (frame?.hasDino === false) return;
    cb(frame);
  }),
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

  // New API names used by the original Yeti HUD source. Keeping these aliases
  // present prevents a saved voiceEnabled setting from breaking the dashboard.
  mumbleGetStatus: () => invoke('mumbleGetStatus'),
  mumbleConnect: (username) => invoke('mumbleConnect', username),
  mumbleDownload: () => invoke('mumbleDownload'),
  mumbleInstallPlugin: () => invoke('mumbleInstallPlugin'),
  mumbleConfigurePlugin: () => invoke('mumbleConfigurePlugin'),
  recordVoiceKey: () => invoke('recordVoiceKey'),
  onVoicePtt: (cb) => listen('voicePtt', cb),

  updaterRestart: () => invoke('updaterRestart'),
  updaterCheck: () => invoke('updaterCheck'),
  updaterGetState: () => invoke('updaterGetState'),
  onUpdaterEvent: noopListener
});
