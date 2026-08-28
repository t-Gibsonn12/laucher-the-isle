import type {
  ApiResult,
  GarageData,
  IsleOverlayBridge,
  LiveFrame,
  MapCatalog,
  OverlaySettings,
  PlayerMe,
  VoiceSettings,
  VoiceState,
} from "./preload";
import { DEFAULT_PALETTE } from "./skin3d/types";

const noop = () => {};

const defaultSettings: OverlaySettings = {
  apiBaseUrl: "https://yeti2.islepilot.eu",
  steamId: "76561198000000000",
  overlayToken: "browser-demo",
  opacity: 1,
  layout: null,
  panels: { stats: true, prime: true, heart: true, radar: false },
  theme: {
    accent: "#7cf2a6",
    stat: {
      health: "#ff5a5a",
      stamina: "#35d6a4",
      food: "#ffb454",
      water: "#5ab6ff",
    },
  },
  radarBounds: null,
  radarSize: 320,
  radarRange: 1,
  radarLabels: true,
  cursorEnabled: true,
  cursorKey: "Insert",
  cursorMode: "toggle",
  dashKey: "F8",
  streamerMode: false,
  compatMode: false,
};

const demoVoiceSettings: VoiceSettings = {
  enabled: true,
  autoStart: true,
  bridgeHost: "voice.yeti.local",
  bridgePort: 8890,
  apiKey: "browser-demo-key",
  mumbleHost: "voice.yeti.local",
  mumblePort: 64738,
  mumbleUsername: "Duy",
  mumblePassword: "",
  mumbleChannel: "The Isle - Lobby",
  pttEnabled: true,
  pttKey: "V",
  debugLog: false,
  smoothing: 0.8,
  panSmoothing: 0.95,
  reconnectSec: 8,
};

const demoVoiceState: VoiceState = {
  phase: "ready",
  running: false,
  configured: true,
  steamIdentityReady: true,
  runtimeFound: true,
  packagedPluginFound: true,
  installedPluginFound: true,
  pid: null,
  lastError: null,
  lastExitCode: null,
  paths: {
    runtimeRoot: "C:\\Yeti\\resources\\yeti-voice",
    mumbleExe: "C:\\Yeti\\resources\\yeti-voice\\mumble\\mumble.exe",
    mumbleConfig: "C:\\Users\\Demo\\AppData\\Roaming\\isle-overlay\\yeti-mumble-settings.json",
    pluginDir: "C:\\Users\\Demo\\AppData\\Roaming\\Mumble\\Mumble\\Plugins",
    pluginLog: "C:\\Users\\Demo\\AppData\\Roaming\\Mumble\\Mumble\\Plugins\\yeti_voice.log",
  },
};

const demoPlayer: PlayerMe = {
  hasData: true,
  steamId: "76561198000000000",
  name: "Duy",
  server: "Máy chủ của bạn · Bản chạy thử",
  online: true,
  species: "Tyrannosaurus",
  female: false,
  growth: 1,
  health: 4725,
  maxHealth: 5000,
  hunger: 76,
  maxHunger: 100,
  thirst: 88,
  maxThirst: 100,
  stamina: 930,
  maxStamina: 1000,
  nutrition: { carb: 4200, protein: 3850, lipid: 4450 },
  prime: {
    eligible: true,
    elder: false,
    required: 5,
    total: 10,
    done: 6,
    quests: [
      { name: "Đến Thánh địa khi còn thiếu niên", done: true },
      { name: "Được sinh ra từ tổ", done: true },
      { name: "Đạt chế độ ăn hoàn hảo", done: true },
      { name: "Đến vùng Di cư lớn", done: true },
      { name: "Đến 2 vùng Di cư", done: true },
      { name: "Đến 4 vùng Tuần tra", done: true },
      { name: "Không bao giờ bị vô sinh", done: true },
      { name: "Không bao giờ bị co thắt cơ", done: true },
      { name: "Sống sót đến khi trưởng thành", done: false },
      { name: "Hoàn thành một lượt tuần tra", done: false },
    ],
  },
};

const demoLive: LiveFrame = {
  steamId: demoPlayer.steamId,
  hasDino: true,
  growth: demoPlayer.growth ?? 1,
  health: demoPlayer.health ?? 0,
  maxHealth: demoPlayer.maxHealth ?? 1,
  hunger: demoPlayer.hunger ?? 0,
  maxHunger: demoPlayer.maxHunger ?? 1,
  thirst: demoPlayer.thirst ?? 0,
  maxThirst: demoPlayer.maxThirst ?? 1,
  stamina: demoPlayer.stamina ?? 0,
  maxStamina: demoPlayer.maxStamina ?? 1,
  nutrition: { carb: 4200, protein: 3850, lipid: 4450 },
  position: { x: -43210, y: 16840, z: 240, yaw: 128 },
};

const demoGarage: GarageData = {
  settings: {
    sellingEnabled: true,
    currencyName: "xu",
    liveSwap: true,
    selfSlayEnabled: true,
    mutationPickEnabled: true,
  },
  dinos: [
    {
      id: "demo-trex",
      name: "Prime Rex",
      species: "Tyrannosaurus",
      className: "Tyrannosaurus",
      gender: "Male",
      growth: 1,
      health: 0.95,
      hunger: 0.76,
      thirst: 0.88,
      stamina: 0.93,
      isPrimeElder: true,
      parkedAt: new Date().toISOString(),
      palette: { ...DEFAULT_PALETTE },
      sellPrice: 12500,
      mutationEligible: true,
      pickableMutations: ["Reinforced Tendons", "Hypermetabolic Inanition", "Gastronomic Regeneration"],
    },
    {
      id: "demo-herra",
      name: "Thợ săn đêm",
      species: "Herrerasaurus",
      className: "Herrerasaurus",
      gender: "Female",
      growth: 0.84,
      health: 0.88,
      hunger: 0.64,
      thirst: 0.72,
      stamina: 0.9,
      isPrimeElder: false,
      parkedAt: new Date().toISOString(),
      palette: {
        ...DEFAULT_PALETTE,
        body: "#303b35",
        markings: "#121817",
        display: "#78c7a0",
        eyes: "#ffca62",
      },
      sellPrice: 4500,
      mutationEligible: false,
      pickableMutations: [],
    },
  ],
};

const shopData = {
  skinShopEnabled: true,
  skinAllowed: true,
  dinoShopEnabled: true,
  dinoAllowed: true,
  balance: 25000,
  currencyName: "xu",
  currencySymbol: "🦖",
  sellRefundPct: 50,
  skins: [
    {
      id: "skin-ember",
      name: "Tàn lửa",
      species: "Tyrannosaurus",
      price: 3500,
      allSpecies: false,
      maxUses: null,
      palette: {
        ...DEFAULT_PALETTE,
        body: "#572d24",
        markings: "#231613",
        flank: "#804936",
        display: "#ff8a4c",
      },
    },
  ],
  owned: [],
  dinos: [
    {
      id: "shop-1",
      species: "Herrerasaurus",
      growth: 1,
      gender: "Female",
      isPrimeElder: false,
      price: 8500,
      soldBySteamId: null,
      mutations: ["Reinforced Tendons", "Gastronomic Regeneration"],
      palette: {
        ...DEFAULT_PALETTE,
        body: "#53654a",
        markings: "#263024",
        display: "#d5dd87",
      },
    },
  ],
};

function loadSettings(): OverlaySettings {
  try {
    const saved = JSON.parse(localStorage.getItem("isle-overlay-browser-demo") ?? "null");
    return saved && typeof saved === "object" ? { ...defaultSettings, ...saved } : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}

function delayed<T>(cb: (value: T) => void, value: T): () => void {
  const timer = window.setTimeout(() => cb(value), 0);
  return () => window.clearTimeout(timer);
}

function apiResponse(pathname: string): unknown {
  if (pathname === "/api/overlay/me") return demoPlayer;
  if (pathname === "/api/overlay/tickets/summary") {
    return { unreadTickets: 0, hasUrgent: false, staff: { assignedUnread: 0 } };
  }
  if (pathname === "/api/overlay/mapedit/access") return { admin: false };
  if (pathname === "/api/overlay/admin/access") return { enabled: true };
  if (pathname === "/api/overlay/garage") return demoGarage;
  if (pathname.startsWith("/api/overlay/garage/status")) return { status: "done" };
  if (pathname === "/api/overlay/shop") return shopData;
  if (pathname === "/api/overlay/map") {
    return {
      liveMapEnabled: true,
      allowed: true,
      calibration: {
        a: { worldX: -100000, worldY: -100000, u: 0, v: 1 },
        b: { worldX: 100000, worldY: 100000, u: 1, v: 0 },
      },
      pois: [],
      categories: [],
      markers: [],
      foodSpawnsEnabled: false,
    };
  }
  if (pathname === "/api/overlay/tickets") return { tickets: [] };
  return {};
}

export function installBrowserDemoBridge(): void {
  if (window.isleOverlay) return;

  document.documentElement.classList.add("browser-demo");
  let settings = loadSettings();
  let voiceSettings = { ...demoVoiceSettings };
  let voiceState = { ...demoVoiceState };
  const settingsListeners = new Set<(value: OverlaySettings) => void>();
  const authListeners = new Set<(value: { steamId: string | null; authed: boolean }) => void>();
  const voiceListeners = new Set<(value: VoiceState) => void>();

  const persist = () => {
    localStorage.setItem("isle-overlay-browser-demo", JSON.stringify(settings));
  };
  const authValue = () => ({
    steamId: settings.steamId ?? null,
    authed: Boolean(settings.overlayToken),
  });
  const emitSettings = () => settingsListeners.forEach((listener) => listener(settings));
  const emitAuth = () => {
    const value = authValue();
    authListeners.forEach((listener) => listener(value));
  };
  const emitVoice = () => voiceListeners.forEach((listener) => listener(voiceState));

  const bridge: IsleOverlayBridge = {
    getSettings: async () => settings,
    setSettings: async (next) => {
      settings = { ...settings, ...next };
      persist();
      emitSettings();
      return settings;
    },
    getState: async () => ({ gameDetected: true, active: true, focused: true }),
    setMouseIgnore: async () => {},
    onState: (cb) => delayed(cb, { gameDetected: true, active: true, focused: true }),
    quit: async () => {},
    steamLogin: async () => {
      settings = {
        ...settings,
        steamId: demoPlayer.steamId,
        overlayToken: "browser-demo",
      };
      persist();
      emitSettings();
      emitAuth();
      return { pending: false };
    },
    getAuth: async () => authValue(),
    logout: async () => {
      settings = { ...settings, steamId: null, overlayToken: null };
      persist();
      emitSettings();
      emitAuth();
    },
    onAuthChanged: (cb) => {
      authListeners.add(cb);
      return () => authListeners.delete(cb);
    },
    apiGet: async <T>(pathname: string) => apiResponse(pathname) as ApiResult<T>,
    apiPost: async <T>() => ({ ok: true } as unknown as ApiResult<T>),
    apiGetFile: async () => ({ error: "Không thể xem trước tệp trong bản chạy thử trên trình duyệt." }),
    getMapCatalog: async (): Promise<MapCatalog> => ({ meshes: [], blueprints: [] }),
    onLive: (cb) => delayed(cb, demoLive),
    onTicket: () => noop,
    onTroll: () => noop,
    onTrollAudio: () => noop,
    sendLiveSkin: async () => {},
    recordCursorKey: async () => null,
    recordDashKey: async () => null,
    setDashOpen: async () => {},
    onDash: (cb) => delayed(cb, true),
    onCursor: (cb) => delayed(cb, true),
    onBlocked: (cb) => delayed(cb, false),
    onSettingsChanged: (cb) => {
      settingsListeners.add(cb);
      return () => settingsListeners.delete(cb);
    },
    radarToggle: async () => false,
    radarClose: async () => {},
    radarIsOpen: async () => false,
    radarGetBounds: async () => null,
    radarSetBounds: async () => {},
    onRadarChanged: () => noop,
    voiceGetSettings: async () => voiceSettings,
    voiceSetSettings: async (next) => {
      voiceSettings = { ...voiceSettings, ...next };
      voiceState = {
        ...voiceState,
        phase: voiceSettings.enabled ? "ready" : "disabled",
        configured: Boolean(voiceSettings.bridgeHost && voiceSettings.apiKey && voiceSettings.mumbleHost),
      };
      emitVoice();
      return voiceSettings;
    },
    voiceGetState: async () => voiceState,
    voicePrepare: async () => voiceState,
    voiceInstallPlugin: async () => {
      voiceState = { ...voiceState, installedPluginFound: true, phase: "ready" };
      emitVoice();
      return voiceState;
    },
    voiceStart: async () => {
      voiceState = { ...voiceState, running: true, phase: "running", pid: 4242 };
      emitVoice();
      return voiceState;
    },
    voiceStop: async () => {
      voiceState = { ...voiceState, running: false, phase: "ready", pid: null };
      emitVoice();
      return voiceState;
    },
    voiceRecordPttKey: async () => {
      voiceSettings = { ...voiceSettings, pttKey: "V" };
      return "V";
    },
    voiceOpenPluginFolder: async () => "",
    onVoiceState: (cb) => {
      voiceListeners.add(cb);
      const offInitial = delayed(cb, voiceState);
      return () => {
        offInitial();
        voiceListeners.delete(cb);
      };
    },
    updaterRestart: async () => false,
    updaterCheck: async () => false,
    updaterGetState: async () => ({ state: "demo" }),
    onUpdaterEvent: () => noop,
  };

  window.isleOverlay = bridge;
}
