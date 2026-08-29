const { app } = require('electron');

// The original isle-overlay runtime enables these Chromium switches when
// transparent overlay composition is unreliable on Windows. The launcher hosts
// the same HUD inside its own Electron process, so the switches must be applied
// before app.whenReady()/BrowserWindow creation, not from the HUD module later.
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-direct-composition');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  console.log('[HUD bootstrap] Windows transparent-overlay compatibility enabled');

  // Port the upstream Windows focus behavior: the HUD is rendered only while
  // The Isle is the foreground window, and F8 mouse interaction keeps keyboard
  // focus inside the game.
  require('./hud-focus-guard');
}

require('./main');
