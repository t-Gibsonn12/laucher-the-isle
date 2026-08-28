# Dino Community — The Isle Launcher

Electron desktop launcher for a The Isle Evrima community server. The UI is already in place; the current core now includes real server querying, Steam game detection/process monitoring, System Tray runtime, Module Manager, structured diagnostics and a Windows auto-update pipeline. HUD and proximity voice remain separate modules for the next integration phase.

## Current core systems

- Frameless Windows desktop launcher with a black / muted-green visual system.
- `CHƠI NGAY` opens The Isle through Steam (`steam://run/376210`).
- Automatic Steam library discovery using the Windows registry and `libraryfolders.vdf`.
- Automatic detection of The Isle install directory and Evrima executable.
- Process monitor for `TheIsleClient-Win64-Shipping.exe` / `TheIsle.exe`.
- The Play button automatically changes to `ĐANG CHƠI` while the game process is running.
- Real The Isle Evrima server query through GameDig (`tie` / EOS protocol).
- Player count, max players and query RTT/ping rendered into the top server status bar.
- Server status automatically refreshes every 30 seconds.
- System Tray runtime: close-to-tray, launch game from tray, module status and clean quit.
- Optional auto-hide when The Isle starts and auto-restore when the game exits.
- Module Manager with lifecycle states, per-module enable/disable and Auto Start.
- Built-in `game-bridge` module prepared as the lifecycle bridge for future HUD/Voice data.
- Reserved external module slots for `hud`, `voice` and `discord`.
- Structured logs for launcher, game monitor, server, updater and module manager.
- In-launcher Settings panel for runtime behavior, game detection, modules, config and logs.
- GitHub Releases based auto updater using `electron-updater`.
- NSIS Windows installer build through `electron-builder`.
- GitHub Actions workflow that publishes a Windows release when a `v*` tag is pushed.

## Run locally

Requirements: Node.js 22+ and Steam installed if you want to test game launch/detection.

```bash
npm install
npm start
```

The footer shows `DEV` while running through `npm start`. The production updater only activates in a packaged `.exe` build.

## Launcher Settings

Open `CÀI ĐẶT` in the sidebar or `MỞ CÀI ĐẶT` in Quick Settings. The launcher exposes:

- Close to System Tray.
- Minimize automatically when The Isle starts.
- Restore the launcher when The Isle exits.
- Start with Windows for packaged builds.
- Module Manager status and toggles.
- Re-scan The Isle installation.
- Open the launcher config file.
- Open the diagnostics/log directory.

## Configure the The Isle server

The bundled defaults live in:

```text
config/launcher.config.json
```

On first launch the app creates a user-editable copy in Electron's `userData` directory. If no server IP has been configured, the top-right server button changes to `CẤU HÌNH`; clicking it opens that JSON file directly.

Set the server section:

```json
{
  "server": {
    "type": "tie",
    "host": "YOUR_SERVER_IP_OR_HOSTNAME",
    "port": 7777,
    "queryPort": 7777,
    "maxPlayers": 300,
    "refreshIntervalMs": 30000
  }
}
```

If your server uses a dedicated EOS/query port, put that port in `queryPort`. After saving the file, click `KIỂM TRA`; the launcher reloads the configuration automatically, so no restart is required.

Environment-variable overrides are also supported:

```text
DINO_SERVER_HOST
DINO_SERVER_PORT
DINO_QUERY_PORT
```

## Module architecture

The Module Manager tracks these states: `disabled`, `not-installed`, `waiting-game`, `ready`, `running`, `stopped` and `error`.

Modules that require The Isle stay in `waiting-game` until the Game Monitor detects the process. They are stopped again when the game exits. Trusted release modules can be installed under:

```text
modules/
  hud/index.js
  voice/index.js
  discord/index.js
```

See `modules/README.md` for the lifecycle contract.

## Diagnostics

Logs are written under Electron `userData/logs/` and split into:

```text
launcher.log
game-monitor.log
server.log
updater.log
modules.log
```

Use `CÀI ĐẶT -> MỞ THƯ MỤC LOG` when debugging a member machine.

## Windows build

Build an installer locally:

```bash
npm run dist
```

The installer is written to:

```text
dist/
```

## Release / Auto Update

The package is configured to publish releases to:

```text
t-Gibsonn12/laucher-the-isle
```

To publish through GitHub Actions, bump the version in `package.json`, commit it, then create and push a matching tag, for example:

```bash
git tag v0.3.0
git push origin v0.3.0
```

The workflow builds the NSIS installer and publishes the update metadata required by `electron-updater`.

## Structure

```text
config/
  launcher.config.json          Bundled launcher defaults

electron/
  main.js                       Electron runtime + IPC + tray + core wiring
  preload.js                    Secure renderer bridge
  services/
    config-service.js           Bundled/user configuration + atomic persistence
    game-service.js             Steam discovery + game process monitor
    server-service.js           Evrima server query
    updater-service.js          Production auto updater
    logger-service.js           Structured persistent logs
    module-manager.js           Module registry + lifecycle controller
    tray-service.js             Windows System Tray integration

modules/
  README.md                     Trusted module contract

src/
  assets/
    hero-art.svg
    logo-mark.svg
  index.html                    Launcher dashboard
  styles.css                    Main visual system
  settings.css                  Settings / Module Manager visual system
  renderer.js                   Dashboard status binding
  settings-ui.js                Settings / Module Manager controller

.github/workflows/
  release.yml                   Windows build/release automation
```

## Next integration phase

### HUD overlay

Implement `modules/hud/index.js` as a dedicated transparent overlay process/window. The Module Manager will start and stop it automatically according to Game Monitor state.

### Proximity voice

Implement `modules/voice/index.js` around the selected Mumble/Exile-style voice architecture. The launcher remains responsible for configuration, lifecycle and UI while the voice engine handles audio capture, positional updates and network communication.

Direct joining into an Evrima/EOS server is intentionally not faked with `steam://connect`; that feature should only be added after a reliable EOS session/direct-join method has been verified.
