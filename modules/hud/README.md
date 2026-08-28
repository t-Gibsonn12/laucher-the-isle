# HUD Overlay module

HUD v0.1 is a separate transparent Electron overlay managed by the launcher Module Manager.

## Lifecycle

- Starts automatically when `TheIsleClient-Win64-Shipping.exe` / `TheIsle.exe` is detected.
- Stops and destroys the overlay when the game exits.
- Uses a transparent, frameless, always-on-top window.
- Normal HUD mode is click-through so it does not block game controls.
- `F7` toggles the interactive HUD menu.
- `F8` hides/shows the complete HUD.

For the most reliable overlay behavior use Borderless/Windowed Fullscreen. Exclusive fullscreen can prevent ordinary desktop overlays from being composited above the game on Windows.

## Current data

The launcher already sends live module context for:

- game running/process/install state;
- configured server online state;
- server player count/max players;
- query ping;
- map/name when returned by the server query;
- launcher/update state.

Character survival data is deliberately isolated behind a data contract. Until a verified The Isle data source is connected, the HUD displays design/demo character values instead of pretending they are live game memory.

A future Game Bridge can send:

```js
moduleManager.updateContext({
  character: {
    name: 'Triceratops',
    stage: 'Prime Elder',
    health: 100,
    stamina: 82,
    hunger: 21,
    thirst: 72,
    growth: 96,
    nutrition: {
      carbs: 570.7,
      protein: 354.0,
      fat: 874.1
    },
    prime: [
      { label: 'Đã đạt Prime Elder', done: true }
    ]
  }
});
```

The HUD renderer automatically switches from demo values to `context.character` when this object becomes available.

## Files

```text
modules/hud/
  index.js       Overlay lifecycle, hotkeys and BrowserWindow
  preload.js     Context-isolated renderer bridge
  overlay.html   HUD layout
  overlay.css    HUD visual system
  overlay.js     Runtime rendering/menu behavior
```
