const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(ROOT, 'modules', 'hud', 'upstream-src');
const SOURCE_SRC = path.join(SOURCE_ROOT, 'src');
const OUTPUT_ROOT = path.join(ROOT, 'modules', 'hud', 'upstream-dist');
const BUILD_META = path.join(OUTPUT_ROOT, '.build-meta.json');
const force = process.argv.includes('--force');

const LOCAL_UPSTREAM_SRC_CANDIDATES = [
  // User's current layout:
  // Desktop/isle-overlay-main/laucher-the-isle
  // Desktop/isle-overlay-main/src
  path.resolve(ROOT, '..', 'src'),

  // Also support the launcher and isle-overlay-main as sibling folders.
  path.resolve(ROOT, '..', 'isle-overlay-main', 'src')
];

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with code ${result.status}`);
  }
}

function isOriginalHudSrc(dir) {
  return Boolean(
    dir &&
    fs.existsSync(path.join(dir, 'App.tsx')) &&
    fs.existsSync(path.join(dir, 'MainWindow.tsx')) &&
    fs.existsSync(path.join(dir, 'main.tsx')) &&
    fs.existsSync(path.join(dir, 'styles.css'))
  );
}

function sameDirectory(a, b) {
  try {
    return fs.realpathSync(a).toLowerCase() === fs.realpathSync(b).toLowerCase();
  } catch {
    return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  }
}

function mirrorDirectory(source, destination) {
  const staging = `${destination}.sync-tmp`;
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(staging), { recursive: true });
  fs.cpSync(source, staging, { recursive: true, force: true });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.renameSync(staging, destination);
}

function syncOriginalSrcIfAvailable() {
  const candidate = LOCAL_UPSTREAM_SRC_CANDIDATES.find(
    (dir) => isOriginalHudSrc(dir) && !sameDirectory(dir, SOURCE_SRC)
  );

  if (!candidate) {
    console.log('[HUD] Local original isle-overlay src not found; using vendored HUD snapshot.');
    return false;
  }

  console.log(`[HUD] Copying ORIGINAL isle-overlay src -> launcher: ${candidate}`);
  mirrorDirectory(candidate, SOURCE_SRC);
  console.log('[HUD] Original src copied completely (including launcher/, livemap/, skin3d/ and all CSS/TSX files).');
  return true;
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out.sort();
}

function fingerprint() {
  const hash = crypto.createHash('sha256');
  for (const file of walk(SOURCE_ROOT)) {
    hash.update(path.relative(SOURCE_ROOT, file).replaceAll('\\', '/'));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex');
}

function readMeta() {
  try { return JSON.parse(fs.readFileSync(BUILD_META, 'utf8')); }
  catch { return null; }
}

function main() {
  // Do this before every dev/start build so the launcher does not maintain a
  // second hand-edited HUD implementation. When the original isle-overlay repo
  // is available locally, its whole src directory is the source of truth.
  syncOriginalSrcIfAvailable();

  if (!fs.existsSync(path.join(SOURCE_SRC, 'App.tsx'))) {
    throw new Error('Vendored isle-overlay HUD source is missing. Run git pull again.');
  }

  const nodeModules = path.join(SOURCE_ROOT, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    console.log('[HUD] Installing dependencies for vendored isle-overlay HUD...');
    const installCommand = fs.existsSync(path.join(SOURCE_ROOT, 'package-lock.json')) ? 'ci' : 'install';
    run('npm', [installCommand, '--ignore-scripts', '--no-audit', '--no-fund'], SOURCE_ROOT);
  }

  const hash = fingerprint();
  const meta = readMeta();
  const ready = fs.existsSync(path.join(OUTPUT_ROOT, 'index.html'));
  if (!force && ready && meta?.sourceHash === hash) {
    console.log(`[HUD] Original HUD source already built (${hash.slice(0, 12)}).`);
    return;
  }

  console.log('[HUD] Building HUD from the original isle-overlay src copied into launcher...');
  run('npm', ['run', 'build'], SOURCE_ROOT);
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  fs.writeFileSync(BUILD_META, `${JSON.stringify({ sourceHash: hash, builtAt: new Date().toISOString() }, null, 2)}\n`);
  console.log('[HUD] HUD build ready.');
}

try { main(); }
catch (error) {
  console.error('[HUD] Vendored HUD build failed:', error.message || error);
  process.exit(1);
}
