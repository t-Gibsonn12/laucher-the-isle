import {
  findYetiServerById,
  findYetiServerByUrl,
  getDefaultYetiServer,
  getEnabledYetiServers,
  type YetiServerConfig,
} from "./yetiServers";

/**
 * Backward-compatible export for code that still expects a single locked URL.
 * It now points at the default server in the Yeti registry.
 */
export const LOCKED_SERVER_BASE_URL = getDefaultYetiServer().apiBaseUrl;

let correcting = false;

export function getYetiServerCatalog(): YetiServerConfig[] {
  return getEnabledYetiServers();
}

export async function getActiveYetiServer(): Promise<YetiServerConfig> {
  try {
    const current = await window.isleOverlay.getSettings();
    return findYetiServerByUrl(current.apiBaseUrl) ?? getDefaultYetiServer();
  } catch {
    return getDefaultYetiServer();
  }
}

async function clearServerSession() {
  // Electron logout also stops the live WebSocket, which prevents a stale
  // Server #1 connection from remaining alive after switching to Server #2.
  try {
    await window.isleOverlay.logout();
  } catch {
    // Browser demo / unusual bridges may implement logout as a no-op.
  }
}

/**
 * Switch to another server that is already registered in YETI_SERVERS.
 * Authentication is cleared only when the API endpoint actually changes,
 * preventing a token or live socket from Server #1 leaking into #2 / #3.
 *
 * This function is ready for a future server-picker UI. For now the registry
 * contains only Yeti Vietnamese #1, so users will not see phantom servers.
 */
export async function selectYetiServer(serverId: string): Promise<YetiServerConfig> {
  const target = findYetiServerById(serverId);
  if (!target) throw new Error(`Máy chủ Yeti không hợp lệ: ${serverId}`);

  const current = await window.isleOverlay.getSettings();
  const active = findYetiServerByUrl(current.apiBaseUrl);
  if (active?.id === target.id) return target;

  correcting = true;
  try {
    await clearServerSession();
    await window.isleOverlay.setSettings({
      apiBaseUrl: target.apiBaseUrl,
      steamId: null,
      overlayToken: null,
    });
  } finally {
    correcting = false;
  }

  return target;
}

async function enforceAllowedYetiServer() {
  if (correcting) return;

  try {
    const current = await window.isleOverlay.getSettings();

    // Any enabled server in our registry is accepted. This is the important
    // difference from the old hard-lock that only allowed yeti2.islepilot.eu.
    if (findYetiServerByUrl(current.apiBaseUrl)) return;

    // Unknown / manually injected domains are rejected and migrated back to
    // the default Yeti server. Clear auth because tokens are server-specific.
    const fallback = getDefaultYetiServer();
    correcting = true;
    await clearServerSession();
    await window.isleOverlay.setSettings({
      apiBaseUrl: fallback.apiBaseUrl,
      steamId: null,
      overlayToken: null,
    });
  } catch {
    // Keep booting even when the bridge is unavailable in an unusual environment.
  } finally {
    correcting = false;
  }
}

export async function installServerLock() {
  await enforceAllowedYetiServer();

  const off = window.isleOverlay.onSettingsChanged((settings) => {
    if (!findYetiServerByUrl(settings.apiBaseUrl)) void enforceAllowedYetiServer();
  });

  // Defense-in-depth: settings files can be edited while the app is running.
  const timer = window.setInterval(() => void enforceAllowedYetiServer(), 5000);

  window.addEventListener(
    "beforeunload",
    () => {
      window.clearInterval(timer);
      off();
    },
    { once: true },
  );
}
