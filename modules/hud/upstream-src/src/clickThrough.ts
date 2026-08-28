import { isInteractLocked } from "./interaction";

let installed = false;

function isInteractivePoint(x: number, y: number) {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return false;

  // Settings uses a full-screen backdrop. Only the settings card itself should
  // capture clicks; the transparent area around it must remain click-through so
  // the user can keep using Windows/other apps while F8 stays open.
  const settingsBackdrop = el.closest(".settingsBackdrop");
  if (settingsBackdrop && !el.closest(".settingsFrame")) return false;

  return Boolean(el.closest(".interactive-region, .mainWin, .settingsFrame"));
}

export function installDashboardClickThrough() {
  if (installed) return;
  installed = true;

  let cursorActive = false;
  let lastIgnore: boolean | null = null;
  let queued = false;
  let queuedIgnore = true;

  const apply = (ignore: boolean) => {
    if (ignore === lastIgnore) return;
    lastIgnore = ignore;
    void window.isleOverlay.setMouseIgnore(ignore);
  };

  const schedule = (ignore: boolean) => {
    queuedIgnore = ignore;
    if (queued) return;
    queued = true;

    // App.tsx has an older mouse-interaction listener. Apply our hit-test after
    // the current mouse event completes so this value wins without destabilising
    // the existing widget drag/cursor flow.
    queueMicrotask(() => {
      queued = false;
      apply(queuedIgnore);
    });
  };

  const evaluate = (x: number, y: number) => {
    if (isInteractLocked()) {
      schedule(false);
      return;
    }
    if (!cursorActive) {
      schedule(true);
      return;
    }
    schedule(!isInteractivePoint(x, y));
  };

  const onMove = (event: MouseEvent) => evaluate(event.clientX, event.clientY);
  const onDown = (event: MouseEvent) => {
    if (cursorActive && isInteractivePoint(event.clientX, event.clientY)) schedule(false);
  };
  const onUp = (event: MouseEvent) => evaluate(event.clientX, event.clientY);

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mousedown", onDown);
  window.addEventListener("mouseup", onUp);

  window.isleOverlay.onCursor((on) => {
    cursorActive = Boolean(on);
    // Release the rest of the full-screen transparent window immediately. The
    // next forwarded mousemove turns interaction back on only over a Yeti panel.
    schedule(true);
  });

  // Start click-through until F8/cursor mode explicitly enables interaction.
  schedule(true);
  console.log("[YETI INPUT] dashboard region click-through enabled");
}
