# Dino Community Launcher Modules

This directory is reserved for trusted modules shipped with launcher releases.

## Current module registry

- `game-bridge` — built into the launcher core; monitors The Isle lifecycle and becomes the bridge point for game state.
- `hud` — reserved for the real overlay module.
- `voice` — reserved for the proximity/3D voice engine.
- `discord` — reserved for Discord account/presence integration.

## Module lifecycle

The core Module Manager owns `enabled`, `autoStart`, `available`, `status`, version and lifecycle state. Modules that require The Isle stay in `waiting-game` until the game process is detected. When the game exits, the manager stops those modules cleanly.

External modules use this folder structure:

```text
modules/
  hud/
    index.js
  voice/
    index.js
  discord/
    index.js
```

An `index.js` module may export `version`, `start()` and `stop()`, or export a `create({ logger })` function returning an object with `start()` / `stop()` methods.

Example contract:

```js
module.exports = {
  version: '1.0.0',
  async start() {
    // Start the module service/process.
  },
  async stop() {
    // Stop it cleanly.
  }
};
```

Only module files delivered as part of trusted launcher release packages should be loaded. Do not download and execute arbitrary JavaScript at runtime.
