# HUD module — vendored from isle-overlay-main

The launcher no longer generates, recreates or clones a second HUD implementation.

The complete HUD source used by the launcher is committed under:

```text
modules/hud/upstream-src/
```

It was migrated from `t-Gibsonn12/isle-overlay-main` and remains the implementation for StatsWidget, Prime, Radar/mini map, MainWindow, draggable widgets, appearance controls and the existing overlay UI.

The map-editor datasets required by that source are also vendored unchanged under:

```text
modules/hud/upstream-src/resources/
```

`modules/hud/index.js` is only the Electron host/lifecycle adapter. `host-preload.js` exposes the compatibility bridge expected by the original HUD.

## Build

`npm start`, `npm run dist`, `npm run dist:dir` and `npm run publish` call `npm run hud:prepare` automatically. On the first run the HUD subproject installs its frontend-only dependencies and builds to:

```text
modules/hud/upstream-dist/
```

Force a rebuild with:

```bash
npm run hud:rebuild
```

The build script fingerprints the vendored source and skips rebuilding when nothing changed.

There is no runtime Git clone, no cache checkout and no hand-made replacement HUD.
