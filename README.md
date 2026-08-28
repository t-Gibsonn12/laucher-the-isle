# Dino Community — The Isle Launcher

Electron desktop launcher shell for a The Isle community server. The first milestone intentionally focuses on the launcher frame/UI only; HUD and proximity voice are represented as polished placeholders so their real modules can be integrated later without redesigning the dashboard.

## Current milestone

- Frameless Windows desktop launcher.
- Black / neon-green visual system based on the supplied reference.
- Sidebar navigation, account card, server status header, hero area, announcements, news, patch notes and quick settings.
- Custom minimize / maximize / close controls.
- `CHƠI NGAY` opens The Isle through Steam (`steam://run/376210`).
- Mock server check interaction ready to be replaced by a real query/API.
- HUD and VOIP sections are UI placeholders only for the next milestones.
- Offline SVG artwork included in the repository; no image CDN is required for the launcher shell.

## Run locally

Requirements: Node.js 20+ and Steam installed if you want to test the Play button.

```bash
npm install
npm start
```

## Structure

```text
electron/
  main.js       Electron window and native actions
  preload.js    Secure renderer bridge
src/
  assets/
    hero-art.svg
    logo-mark.svg
  index.html    Launcher dashboard
  styles.css    Complete responsive visual system
  renderer.js   UI interactions
```

## Planned integration

### Phase 2 — HUD

Create a dedicated overlay process/window instead of putting the real HUD inside the launcher dashboard. Keep the launcher responsible for configuration, account/session data and starting/stopping the overlay.

### Phase 3 — Proximity voice

Integrate the selected Mumble/Exile-style voice architecture as a separate voice service/module. The launcher UI should control microphone, push-to-talk, volume and connection state while the voice engine handles capture, positional updates and server communication.

## Notes

The values shown for player count, ping, account name, news and patch notes are visual demo data. Replace them with the real server/API configuration after the launcher shell is approved.
