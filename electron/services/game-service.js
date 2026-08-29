const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const CURRENT_PROCESS_NAMES = [
  'TheIsle-Win64-Shipping.exe',
  'TheIsleClient-Win64-Shipping.exe',
  'TheIsle.exe'
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function getSteamPathFromRegistry() {
  if (process.platform !== 'win32') return null;

  const locations = [
    ['HKCU\\Software\\Valve\\Steam', 'SteamPath'],
    ['HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'],
    ['HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath']
  ];

  for (const [key, valueName] of locations) {
    try {
      const { stdout } = await execFileAsync('reg.exe', ['query', key, '/v', valueName], { windowsHide: true });
      const match = stdout.match(new RegExp(`${valueName}\\s+REG_\\w+\\s+(.+)$`, 'mi'));
      if (match?.[1]) return match[1].trim().replace(/\\/g, '/');
    } catch {
      // Try the next registry location.
    }
  }

  return null;
}

function parseSteamLibraries(steamPath) {
  const libraries = [steamPath];
  if (!steamPath) return [];

  try {
    const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    const vdf = fs.readFileSync(vdfPath, 'utf8');
    for (const match of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
      libraries.push(match[1].replace(/\\\\/g, '\\'));
    }
  } catch {
    // The default Steam library is still usable.
  }

  return unique(libraries.map((item) => path.normalize(item)));
}

function readInstallDirFromManifest(manifestPath) {
  try {
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    return manifest.match(/"installdir"\s+"([^"]+)"/i)?.[1] || null;
  } catch {
    return null;
  }
}

async function detectInstallation(gameConfig) {
  const steamPath = await getSteamPathFromRegistry();
  const fallbackSteamPaths = process.platform === 'win32'
    ? [
        process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Steam'),
        process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Steam')
      ]
    : [];

  const roots = unique([steamPath, ...fallbackSteamPaths]);
  const libraries = unique(roots.flatMap(parseSteamLibraries));
  const appId = String(gameConfig.steamAppId || '376210');

  for (const library of libraries) {
    const manifestPath = path.join(library, 'steamapps', `appmanifest_${appId}.acf`);
    const installDir = readInstallDirFromManifest(manifestPath) || gameConfig.installDirName || 'The Isle';
    const installPath = path.join(library, 'steamapps', 'common', installDir);
    const exeCandidates = [
      path.join(installPath, 'TheIsle.exe'),
      path.join(installPath, 'TheIsle', 'Binaries', 'Win64', 'TheIsle-Win64-Shipping.exe'),
      path.join(installPath, 'TheIsle', 'Binaries', 'Win64', 'TheIsleClient-Win64-Shipping.exe')
    ];
    const executable = exeCandidates.find((candidate) => fs.existsSync(candidate));

    if (fs.existsSync(manifestPath) || fs.existsSync(installPath)) {
      return {
        installed: true,
        steamPath: library,
        installPath,
        executable: executable || null
      };
    }
  }

  return { installed: false, steamPath: steamPath || null, installPath: null, executable: null };
}

function tasklistProcessNames(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.match(/^"([^"]+)"/)?.[1])
    .filter(Boolean);
}

function looksLikeTheIsleClient(name) {
  const value = String(name || '').toLowerCase();
  return value.endsWith('.exe') && value.includes('theisle') && !value.includes('server');
}

async function getRunningProcess(gameConfig) {
  if (process.platform !== 'win32') return { running: false, processName: null };

  try {
    const { stdout } = await execFileAsync('tasklist.exe', ['/FO', 'CSV', '/NH'], {
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024
    });

    const runningNames = tasklistProcessNames(stdout);
    const configured = Array.isArray(gameConfig.processNames) ? gameConfig.processNames : [];
    const candidates = unique([...configured, ...CURRENT_PROCESS_NAMES]);

    const exact = candidates.find((candidate) =>
      runningNames.some((running) => running.toLowerCase() === String(candidate).toLowerCase())
    );
    const generic = runningNames.find(looksLikeTheIsleClient);
    const processName = exact || generic || null;

    return { running: Boolean(processName), processName };
  } catch {
    return { running: false, processName: null };
  }
}

class GameService {
  constructor(gameConfig, onStatus) {
    this.config = gameConfig;
    this.onStatus = onStatus;
    this.timer = null;
    this.installation = null;
    this.lastRunning = null;
  }

  async getStatus({ refreshInstallation = false } = {}) {
    if (!this.installation || refreshInstallation) {
      this.installation = await detectInstallation(this.config);
    }
    const process = await getRunningProcess(this.config);
    return { ...this.installation, ...process };
  }

  async emitStatus(options) {
    const status = await this.getStatus(options);
    this.lastRunning = Boolean(status.running);
    this.onStatus?.(status);
    return status;
  }

  start() {
    this.stop();
    this.emitStatus({ refreshInstallation: true });
    const interval = Math.max(1500, Number(this.config.monitorIntervalMs) || 2500);
    this.timer = setInterval(async () => {
      const status = await this.getStatus();
      if (status.running !== this.lastRunning) {
        this.lastRunning = status.running;
        this.onStatus?.(status);
      }
    }, interval);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = {
  GameService,
  detectInstallation,
  getRunningProcess,
  CURRENT_PROCESS_NAMES,
  tasklistProcessNames,
  looksLikeTheIsleClient
};
