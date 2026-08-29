const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(ROOT, 'modules', 'hud', 'upstream-src');
const OUTPUT_ROOT = path.join(ROOT, 'modules', 'hud', 'upstream-dist');
const BUILD_META = path.join(OUTPUT_ROOT, '.build-meta.json');
const force = process.argv.includes('--force');

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
  if (!fs.existsSync(path.join(SOURCE_ROOT, 'src', 'App.tsx'))) {
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
    console.log(`[HUD] Vendored HUD already built (${hash.slice(0, 12)}).`);
    return;
  }

  console.log('[HUD] Building HUD directly from modules/hud/upstream-src...');
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
