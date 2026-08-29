const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FALLBACK_POSITION,
  isGameRunning,
  mapSnapshot,
  playerPosition
} = require('../modules/hud/runtime-state');

test('HUD does not advertise a player marker before The Isle is running', () => {
  const context = { game: { running: false } };

  assert.equal(isGameRunning(context), false);
  assert.deepEqual(mapSnapshot(context).markers, []);
});

test('HUD provides the self marker required to reveal gameplay widgets', () => {
  const context = { game: { running: true } };
  const snapshot = mapSnapshot(context, 'steam-test');

  assert.equal(isGameRunning(context), true);
  assert.equal(snapshot.markers.length, 1);
  assert.deepEqual(snapshot.markers[0], {
    steamId: 'steam-test',
    label: 'Bạn',
    x: FALLBACK_POSITION.x,
    y: FALLBACK_POSITION.y,
    yaw: FALLBACK_POSITION.yaw,
    self: true
  });
});

test('HUD preserves valid live player coordinates and rejects invalid values', () => {
  const context = {
    game: { running: true },
    character: {
      playerName: 'Raptor',
      position: { x: '123.5', y: -456, z: 'not-a-number', yaw: 270 }
    }
  };

  assert.deepEqual(playerPosition(context), {
    x: 123.5,
    y: -456,
    z: FALLBACK_POSITION.z,
    yaw: 270
  });
  assert.deepEqual(mapSnapshot(context).markers[0], {
    steamId: '76561198000000000',
    label: 'Raptor',
    x: 123.5,
    y: -456,
    yaw: 270,
    self: true
  });
});
