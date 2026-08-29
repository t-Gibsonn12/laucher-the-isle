const FALLBACK_POSITION = Object.freeze({
  x: -43210,
  y: 16840,
  z: 240,
  yaw: 128
});

const GAME_WINDOW_RE = /theisle|the isle|theisleclient|isleclient|isle-win64/i;
let nativeWindows = undefined;

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getNativeWindows() {
  if (nativeWindows !== undefined) return nativeWindows;
  nativeWindows = null;
  if (process.platform !== 'win32') return nativeWindows;
  try {
    // Lazy load so CI/non-Windows environments do not need Win32 DLL access.
    // eslint-disable-next-line global-require
    nativeWindows = require('./native-windows.cjs');
  } catch {
    nativeWindows = null;
  }
  return nativeWindows;
}

function nativeGameForeground() {
  const nw = getNativeWindows();
  if (!nw) return false;
  try {
    const hwnd = nw.GetForegroundWindow();
    if (!hwnd) return false;
    const pid = nw.windowPid(hwnd);
    const title = String(nw.windowTitle(hwnd) || '');
    const imagePath = String(nw.processImagePath(pid) || '');
    return GAME_WINDOW_RE.test(title) || GAME_WINDOW_RE.test(imagePath);
  } catch {
    return false;
  }
}

function isGameRunning(context = {}) {
  // Launcher process monitoring is the primary source. Native foreground
  // detection is the hard fallback used by the original isle-overlay runtime.
  // This prevents Stats/Prime/Radar from being permanently hidden when Evrima
  // changes the executable/window identity before the process monitor catches up.
  return Boolean(context.game?.running || nativeGameForeground());
}

function playerPosition(context = {}) {
  const position = context.character?.position || {};
  return {
    x: finiteNumber(position.x, FALLBACK_POSITION.x),
    y: finiteNumber(position.y, FALLBACK_POSITION.y),
    z: finiteNumber(position.z, FALLBACK_POSITION.z),
    yaw: finiteNumber(position.yaw, FALLBACK_POSITION.yaw)
  };
}

function mapSnapshot(context = {}, steamId = '76561198000000000') {
  const position = playerPosition(context);
  const markers = isGameRunning(context)
    ? [{
        steamId,
        label: context.character?.playerName || 'Bạn',
        x: position.x,
        y: position.y,
        yaw: position.yaw,
        self: true
      }]
    : [];

  return {
    liveMapEnabled: true,
    allowed: true,
    calibration: {
      a: { worldX: -100000, worldY: -100000, u: 0, v: 1 },
      b: { worldX: 100000, worldY: 100000, u: 1, v: 0 }
    },
    pois: [],
    categories: [],
    markers,
    foodSpawnsEnabled: false
  };
}

module.exports = {
  FALLBACK_POSITION,
  isGameRunning,
  nativeGameForeground,
  playerPosition,
  mapSnapshot
};
