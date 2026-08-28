# HUD module — upstream isle-overlay-main

This launcher does **not** maintain a second hand-made HUD renderer.

The HUD frontend is built directly from the existing private repository:

```text
t-Gibsonn12/isle-overlay-main
```

That upstream project remains the source of truth for the HUD UI, including:

- StatsWidget / survival stats;
- Prime panel and Prime quest list;
- Radar / mini map;
- MainWindow dashboard;
- widget settings, dragging and opacity;
- existing The Isle overlay visual system.

## Development flow

`npm start` runs `npm run hud:prepare` first.

The prepare script uses this order:

1. `DINO_ISLE_OVERLAY_SOURCE` if supplied;
2. a sibling clone named `../isle-overlay-main`;
3. a managed clone at `.cache/isle-overlay-main`.

It then runs the upstream project's own `npm install` and `npm run build`, and copies the exact Vite output into:

```text
modules/hud/upstream-dist/
```

The generated build is intentionally ignored by Git so we do not fork or duplicate the HUD source by hand.

To force-sync the latest upstream `main` when the managed cache is used:

```bash
npm run hud:sync
```

## Launcher integration

`modules/hud/index.js` is only a host/runtime adapter. It does not recreate the HUD UI. It:

- creates the transparent Electron overlay window;
- loads the upstream `dist/index.html`;
- starts/stops with The Isle through Module Manager;
- supplies the existing `window.isleOverlay` contract through `host-preload.js`;
- passes launcher/game/server context to the upstream renderer;
- keeps normal gameplay click-through;
- uses `F8` for the upstream dashboard and `F9` to hide/show the overlay.

The compatibility bridge is deliberately separated from the renderer so the original HUD source can be updated without rewriting the UI again.
