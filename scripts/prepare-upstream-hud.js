const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CACHE_ROOT = path.join(ROOT, '.cache', 'isle-overlay-main');
const OUTPUT_ROOT = path.join(ROOT, 'modules', 'hud', 'upstream-dist');
const META_PATH = path.join(ROOT, 'modules', 'hud', 'upstream-meta.json');
const UPSTREAM_GIT = 'https://github.com/t-Gibsonn12/isle-overlay-main.git';
const forceSync = process.argv.includes('--sync');

function exists(filePath) {
  try { return fs.existsSync(filePath); } catch { return false; }
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: process.platform === 'win32',
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout || ''}` : '';
    throw new Error(`${command} ${args.join(' ')} failed with code ${result.status}.${detail}`);
  }
  return options.capture ? String(result.stdout || '').trim() : '';
}

function gitHead(dir) {
  try { return run('git', ['rev-parse', 'HEAD'], dir, { capture: true }); } catch { return null; }
}

function resolveSource() {
  const explicit = process.env.DINO_ISLE_OVERLAY_SOURCE
    ? path.resolve(process.env.DINO_ISLE_OVERLAY_SOURCE)
    : null;
  if (explicit && exists(path.join(explicit, 'package.json'))) return { dir: explicit, managed: false };

  const siblings = [
    path.resolve(ROOT, '..', 'isle-overlay-main'),
    path.resolve(ROOT, '..', 'isle-overlay')
  ];
  for (const dir of siblings) {
    if (exists(path.join(dir, 'package.json')) && exists(path.join(dir, 'src'))) {
      return { dir, managed: false };
    }
  }

  if (!exists(path.join(CACHE_ROOT, '.git'))) {
    fs.mkdirSync(path.dirname(CACHE_ROOT), { recursive: true });
    console.log('[HUD] Cloning exact upstream HUD source: t-Gibsonn12/isle-overlay-main');
    run('git', ['clone', '--depth', '1', '--branch', 'main', UPSTREAM_GIT, CACHE_ROOT], ROOT);
  } else if (forceSync) {
    console.log('[HUD] Updating cached upstream HUD source...');
    run('git', ['fetch', '--depth', '1', 'origin', 'main'], CACHE_ROOT);
    run('git', ['reset', '--hard', 'origin/main'], CACHE_ROOT);
  }

  return { dir: CACHE_ROOT, managed: true };
}

function readMeta() {
  try { return JSON.parse(fs.readFileSync(META_PATH, 'utf8')); } catch { return {}; }
}

function copyDirectory(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function main() {
  const source = resolveSource();
  const head = gitHead(source.dir) || 'working-tree';
  const meta = readMeta();
  const outputReady = exists(path.join(OUTPUT_ROOT, 'index.html'));
  const needsBuild = forceSync || !outputReady || meta.upstreamCommit !== head;

  if (!needsBuild) {
    console.log(`[HUD] Upstream HUD already prepared (${head.slice(0, 12)}).`);
    return;
  }

  console.log(`[HUD] Preparing upstream HUD from ${source.dir}`);
  console.log(`[HUD] Upstream commit: ${head}`);

  // The upstream project owns its React/Vite dependencies. Keeping them there
  // prevents the launcher core dependency graph from drifting from the HUD source.
  run('npm', ['install'], source.dir);
  run('npm', ['run', 'build'], source.dir);

  const dist = path.join(source.dir, 'dist');
  if (!exists(path.join(dist, 'index.html'))) {
    throw new Error(`Upstream build completed but ${path.join(dist, 'index.html')} was not created.`);
  }

  copyDirectory(dist, OUTPUT_ROOT);
  fs.writeFileSync(META_PATH, `${JSON.stringify({
    sourceRepository: 't-Gibsonn12/isle-overlay-main',
    upstreamCommit: head,
    preparedAt: new Date().toISOString(),
    sourcePath: source.dir,
    managedCache: source.managed
  }, null, 2)}\n`, 'utf8');

  console.log(`[HUD] Exact upstream build copied to ${OUTPUT_ROOT}`);
}

try {
  main();
} catch (error) {
  console.error('\n[HUD] Could not prepare upstream isle-overlay HUD.');
  console.error(error.message || error);
  console.error('\nIf the source repository is private, make sure GitHub credentials are available to git,');
  console.error('or set DINO_ISLE_OVERLAY_SOURCE to an existing local clone of isle-overlay-main.');
  process.exit(1);
}
