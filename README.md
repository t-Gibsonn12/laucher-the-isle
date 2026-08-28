# Dino Community — The Isle Launcher

Electron desktop launcher for a The Isle Evrima community server. The launcher UI is already in place; the current core milestone adds real server querying, Steam game detection/process monitoring, and a Windows auto-update pipeline while keeping HUD and proximity voice as future modules.

## Current core systems

- Frameless Windows desktop launcher with the black / muted-green visual system.
- `CHƠI NGAY` opens The Isle through Steam (`steam://run/376210`).
- Automatic Steam library discovery using the Windows registry and `libraryfolders.vdf`.
- Automatic detection of the The Isle install directory and Evrima executable.
- Process monitor for `TheIsleClient-Win64-Shipping.exe` / `TheIsle.exe`.
- The Play button automatically changes to `ĐANG CHƠI` while the game process is running.
- Real The Isle Evrima server query through GameDig (`tie` / EOS protocol).
- Player count, max players and query RTT/ping are rendered into the top server status bar.
- Server status automatically refreshes every 30 seconds.
- GitHub Releases based auto updater using `electron-updater`.
- NSIS Windows installer build through `electron-builder`.
- GitHub Actions workflow that publishes a Windows release when a `v*` tag is pushed.
- HUD and VOIP sections remain UI placeholders for the next milestones.

## Run locally

Requirements: Node.js 22+ and Steam installed if you want to test game launch/detection.

```bash
npm install
npm start
```

The footer shows `DEV` while running through `npm start`. The production updater only activates in a packaged `.exe` build.

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
git tag v0.2.0
git push origin v0.2.0
```

The workflow builds the NSIS installer and publishes the update metadata required by `electron-updater`. Installed launcher builds can then check, download and install newer GitHub Releases.

## Structure

```text
config/
  launcher.config.json          Bundled launcher defaults

electron/
  main.js                       Electron window + IPC + core service wiring
  preload.js                    Secure renderer bridge
  services/
    config-service.js           Bundled/user configuration loader
    game-service.js             Steam discovery + game process monitor
    server-service.js           Evrima server query
    updater-service.js          Production auto updater

src/
  assets/
    hero-art.svg
    logo-mark.svg
  index.html                    Launcher dashboard
  styles.css                    Visual system
  renderer.js                   UI + core status binding

.github/workflows/
  release.yml                   Windows build/release automation
```

## Next milestone

### HUD overlay

Create a dedicated transparent overlay process/window instead of putting the real HUD inside the launcher dashboard. The launcher will own configuration and start/stop the overlay according to the Game Monitor state.

### Proximity voice

Integrate the selected Mumble/Exile-style voice architecture as a separate voice service/module. The launcher will control microphone, push-to-talk, volume and connection state while the voice engine handles capture, positional updates and server communication.
