const FALLBACK_POSITION = Object.freeze({
  x: -43210,
  y: 16840,
  z: 240,
  yaw: 128
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isGameRunning(context = {}) {
  return Boolean(context.game?.running);
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

module.exports = { FALLBACK_POSITION, isGameRunning, playerPosition, mapSnapshot };
