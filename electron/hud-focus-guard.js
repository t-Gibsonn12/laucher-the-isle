const { app, BrowserWindow } = require('electron');
const path = require('path');

module.exports = {};

if (process.platform === 'win32') {
  let nw = null;
  try {
    nw = require(path.join(__dirname, '..', 'modules', 'hud', 'native-windows.cjs'));
  } catch (error) {
    console.warn(`[HUD focus] Native Windows tracking unavailable: ${error?.message || error}`);
  }

  if (nw) {
    const GAME_WINDOW_RE = /theisle|the isle|theisleclient|isleclient|isle-win64/i;
    const HUD_TITLE_RE = /dino community hud|theburntisle overlay/i;
    const states = new WeakMap();
    let gameHwnd = null;
    let lastGameScanAt = 0;
    let tracker = null;
    let lastActive = null;

    function hudState(win) {
      let state = states.get(win);
      if (!state) {
        state = { userHidden: false, guardHidden: false, guardHiding: false };
        states.set(win, state);
      }
      return state;
    }

    function isHudWindow(win) {
      if (!win || win.isDestroyed()) return false;
      try {
        return HUD_TITLE_RE.test(String(win.getTitle() || ''));
      } catch {
        return false;
      }
    }

    function findGameWindow(force = false) {
      const now = Date.now();
      try {
        if (gameHwnd && !nw.IsWindow(gameHwnd)) gameHwnd = null;
        if (!gameHwnd && (force || now - lastGameScanAt >= 1500)) {
          lastGameScanAt = now;
          gameHwnd = nw.findWindow((title, imagePath) => GAME_WINDOW_RE.test(title) || GAME_WINDOW_RE.test(imagePath));
        }
      } catch {
        gameHwnd = null;
      }
      return gameHwnd;
    }

    function isGameForeground() {
      const hwnd = findGameWindow();
      if (!hwnd) return false;
      try {
        const foreground = nw.GetForegroundWindow();
        return Boolean(foreground && nw.isSameWindow(foreground, hwnd));
      } catch {
        return false;
      }
    }

    function gameBounds() {
      const hwnd = findGameWindow();
      if (!hwnd) return null;
      try {
        const bounds = nw.windowBounds(hwnd);
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
        return bounds;
      } catch {
        return null;
      }
    }

    const originalHide = BrowserWindow.prototype.hide;
    const originalShow = BrowserWindow.prototype.show;
    const originalShowInactive = BrowserWindow.prototype.showInactive;
    const originalFocus = BrowserWindow.prototype.focus;
    const originalSetIgnoreMouseEvents = BrowserWindow.prototype.setIgnoreMouseEvents;
    const originalSetFocusable = BrowserWindow.prototype.setFocusable;

    BrowserWindow.prototype.hide = function dinoHudHide(...args) {
      if (isHudWindow(this)) {
        const state = hudState(this);
        if (!state.guardHiding) {
          state.userHidden = true;
          state.guardHidden = false;
        }
      }
      return originalHide.apply(this, args);
    };

    BrowserWindow.prototype.show = function dinoHudShow(...args) {
      if (!isHudWindow(this)) return originalShow.apply(this, args);
      const state = hudState(this);
      state.userHidden = false;
      if (!isGameForeground()) {
        state.guardHidden = true;
        return;
      }
      state.guardHidden = false;
      return originalShow.apply(this, args);
    };

    BrowserWindow.prototype.showInactive = function dinoHudShowInactive(...args) {
      if (!isHudWindow(this)) return originalShowInactive.apply(this, args);
      const state = hudState(this);
      state.userHidden = false;
      if (!isGameForeground()) {
        state.guardHidden = true;
        return;
      }
      state.guardHidden = false;
      return originalShowInactive.apply(this, args);
    };

    BrowserWindow.prototype.focus = function dinoHudFocus(...args) {
      if (!isHudWindow(this)) return originalFocus.apply(this, args);
      if (!isGameForeground()) return;

      // Keep keyboard focus in The Isle while F8 enables mouse interaction on the HUD.
      try { originalSetFocusable.call(this, false); } catch {}
      try { originalShowInactive.call(this); } catch {}
    };

    BrowserWindow.prototype.setIgnoreMouseEvents = function dinoHudMouseIgnore(ignore, options) {
      if (!isHudWindow(this)) return originalSetIgnoreMouseEvents.call(this, ignore, options);

      if (ignore === false && isGameForeground()) {
        try { originalSetFocusable.call(this, false); } catch {}
        const result = originalSetIgnoreMouseEvents.call(this, ignore, options);
        try { originalShowInactive.call(this); } catch {}
        return result;
      }

      const result = originalSetIgnoreMouseEvents.call(this, ignore, options);
      if (ignore !== false) {
        try { originalSetFocusable.call(this, true); } catch {}
      }
      return result;
    };

    function guardHide(win) {
      const state = hudState(win);
      if (!win.isVisible()) {
        state.guardHidden = true;
        return;
      }
      state.guardHiding = true;
      try {
        originalHide.call(win);
        state.guardHidden = true;
      } finally {
        state.guardHiding = false;
      }
    }

    function syncHudWindow(win, active) {
      const state = hudState(win);
      if (!active) {
        guardHide(win);
        return;
      }

      const bounds = gameBounds();
      if (bounds) {
        try {
          const current = win.getBounds();
          if (
            current.x !== bounds.x || current.y !== bounds.y ||
            current.width !== bounds.width || current.height !== bounds.height
          ) {
            win.setBounds(bounds, false);
          }
        } catch {}
      }

      if (!state.userHidden && (!win.isVisible() || state.guardHidden)) {
        state.guardHidden = false;
        try { originalShowInactive.call(win); } catch {}
      }

      if (!state.userHidden) {
        try { win.setAlwaysOnTop(true, 'screen-saver'); } catch {}
        try { win.moveTop(); } catch {}
      }
    }

    function tick() {
      const active = isGameForeground();
      for (const win of BrowserWindow.getAllWindows()) {
        if (isHudWindow(win)) syncHudWindow(win, active);
      }

      if (active !== lastActive) {
        lastActive = active;
        console.log(`[HUD focus] ${active ? 'The Isle foreground -> HUD visible' : 'The Isle not foreground -> HUD hidden'}`);
      }
    }

    app.whenReady().then(() => {
      if (tracker) clearInterval(tracker);
      findGameWindow(true);
      tick();
      tracker = setInterval(tick, 200);
    });

    app.on('before-quit', () => {
      if (tracker) clearInterval(tracker);
      tracker = null;
    });

    console.log('[HUD focus] Upstream Windows foreground guard enabled');
    module.exports = { isGameForeground, gameBounds };
  }
}
