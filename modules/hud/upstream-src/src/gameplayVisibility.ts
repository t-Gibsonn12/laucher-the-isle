type OverlayMeState = {
  error?: string;
  online?: boolean;
  hasData?: boolean;
  species?: string | null;
  health?: number | null;
};

type OverlayMapState = {
  error?: string;
  markers?: Array<{ self?: boolean }>;
};

type LivePresence = {
  hasDino?: boolean;
  position?: { x?: number; y?: number; z?: number; yaw?: number };
};

let timer: number | null = null;
let busy = false;
let active: boolean | null = null;
let activeHits = 0;
let inactiveHits = 0;
let lastLiveFalseAt = 0;
let offLive: (() => void) | null = null;

const REQUIRED_ACTIVE_HITS = 2;
const REQUIRED_INACTIVE_HITS = 2;
const LIVE_FALSE_HOLD_MS = 12000;

function applyGameplayState(next: boolean) {
  const root = document.documentElement;
  if (
    active === next &&
    root.classList.contains(next ? "yeti-gameplay-active" : "yeti-gameplay-hidden")
  ) return;

  active = next;
  root.classList.toggle("yeti-gameplay-active", next);
  root.classList.toggle("yeti-gameplay-hidden", !next);
}

function meLooksActive(me: OverlayMeState): boolean {
  if (me.online !== true) return false;
  if (me.hasData === false) return false;
  if (!String(me.species || "").trim()) return false;
  if (typeof me.health === "number" && me.health <= 0) return false;
  return true;
}

async function readMapPresence(): Promise<boolean | null> {
  try {
    const map = (await window.isleOverlay.apiGet<OverlayMapState>("/api/overlay/map")) as OverlayMapState;
    if (!map || map.error) return null;
    return Boolean(Array.isArray(map.markers) && map.markers.some((m) => m?.self === true));
  } catch {
    return null;
  }
}

async function readMe(): Promise<OverlayMeState | null> {
  try {
    const me = (await window.isleOverlay.apiGet<OverlayMeState>("/api/overlay/me")) as OverlayMeState;
    if (!me || me.error) return null;
    return me;
  } catch {
    return null;
  }
}

function markInactive(immediate = false) {
  activeHits = 0;
  inactiveHits = immediate ? REQUIRED_INACTIVE_HITS : inactiveHits + 1;
  if (inactiveHits >= REQUIRED_INACTIVE_HITS) applyGameplayState(false);
}

function markActive() {
  inactiveHits = 0;
  activeHits += 1;
  if (activeHits >= REQUIRED_ACTIVE_HITS) applyGameplayState(true);
}

async function checkGameplayState() {
  if (busy || !window.isleOverlay?.apiGet) return;
  busy = true;

  try {
    const now = Date.now();

    // A realtime no-dino event is authoritative for lobby, character selection,
    // death and respawn transitions. Keep the HUD locked off for a short window
    // so stale API snapshots cannot flash old Stats/Prime/Radar back on screen.
    if (now - lastLiveFalseAt < LIVE_FALSE_HOLD_MS) {
      markInactive(true);
      return;
    }

    const [mapPresence, me] = await Promise.all([readMapPresence(), readMe()]);

    // Do not reveal gameplay widgets from /me alone. IslePilot can retain the
    // previous character after leaving a server. A real gameplay session must be
    // confirmed by BOTH a current self marker on the live map and a live /me row.
    if (mapPresence === true && me && meLooksActive(me)) {
      markActive();
      return;
    }

    // A successful negative map response or an explicitly offline/dead /me row is
    // enough to count toward hiding. API/network errors keep the last stable state
    // instead of making the HUD blink.
    if (mapPresence === false || (me && !meLooksActive(me))) {
      markInactive();
    }
  } catch {
    // Keep the last stable state on transient API/network errors.
  } finally {
    busy = false;
  }
}

export function installGameplayVisibility() {
  const isRadarWindow = window.location.hash.replace(/^#/, "").startsWith("radar");
  document.documentElement.classList.toggle("yeti-radar-context", isRadarWindow);

  // Always boot hidden. The HUD is only revealed after two consecutive strong
  // confirmations that the player is actually controlling a dinosaur in-server.
  applyGameplayState(false);

  if (window.isleOverlay?.onLive) {
    offLive = window.isleOverlay.onLive((frame: LivePresence) => {
      if (frame?.hasDino === false) {
        lastLiveFalseAt = Date.now();
        markInactive(true);
        return;
      }

      // hasDino=true is deliberately NOT allowed to reveal the HUD by itself.
      // Recovery/fallback frames can briefly contain stale character data while
      // sitting in The Isle menu. Trigger a fresh map + /me verification instead.
      if (frame?.hasDino === true) {
        void checkGameplayState();
      }
    });
  }

  void checkGameplayState();
  timer = window.setInterval(() => void checkGameplayState(), 1500);

  window.addEventListener(
    "beforeunload",
    () => {
      if (timer != null) window.clearInterval(timer);
      timer = null;
      offLive?.();
      offLive = null;
    },
    { once: true },
  );
}
