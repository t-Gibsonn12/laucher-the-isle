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

function executable(command) {
  if (process.platform !== 'win32') return command;
  if (command === 'npm') return 'npm.cmd';
  if (command === 'npx') return 'npx.cmd';
  return command;
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(executable(command), args, {
    cwd,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false,
    encoding: 'utf8'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout || ''}` : '';
    throw new Error(`${command} ${args.join(' ')} failed with code ${result.status}.${detail}`);
  }
  return options.capture ? String(result.stdout || '').trim() : '';
}

function gitHead(dir) {
  try { return run('git', ['rev-parse', 'HEAD'], dir, { capture: true }); } catch { return null; }
}

function cloneManagedSource() {
  fs.mkdirSync(path.dirname(CACHE_ROOT), { recursive: true });
  console.log('[HUD] Cloning exact upstream HUD source: t-Gibsonn12/isle-overlay-main');
  try {
    run('git', ['clone', '--depth', '1', '--branch', 'main', UPSTREAM_GIT, CACHE_ROOT], ROOT);
    return;
  } catch (gitError) {
    fs.rmSync(CACHE_ROOT, { recursive: true, force: true });
    console.warn('[HUD] HTTPS git clone failed; trying GitHub CLI authentication...');
    try {
      run('gh', ['repo', 'clone', 't-Gibsonn12/isle-overlay-main', CACHE_ROOT, '--', '--depth', '1', '--branch', 'main'], ROOT);
      return;
    } catch {
      throw gitError;
    }
  }
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
    cloneManagedSource();
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

function frontendToolingReady(sourceDir) {
  const binDir = path.join(sourceDir, 'node_modules', '.bin');
  const vite = path.join(binDir, process.platform === 'win32' ? 'vite.cmd' : 'vite');
  const tsc = path.join(binDir, process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  return exists(vite) && exists(tsc) && exists(path.join(sourceDir, 'node_modules', 'esbuild'));
}

function prepareDependencies(sourceDir) {
  if (frontendToolingReady(sourceDir)) {
    console.log('[HUD] Reusing existing upstream frontend dependencies.');
    return;
  }

  // We only compile the upstream React/Vite renderer here. Native Electron runtime
  // dependencies (uiohook/koffi) belong to the old runtime and must not be rebuilt
  // just to reuse its HUD frontend. This avoids node-gyp/Windows SDK failures.
  run('npm', ['install', '--ignore-scripts'], sourceDir);

  // Vite needs esbuild's platform binary. Rebuild only esbuild instead of every
  // native package in the upstream application.
  run('npm', ['rebuild', 'esbuild'], sourceDir);
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
  prepareDependencies(source.dir);
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
  console.error('\nUse an existing clone by setting:');
  console.error('  DINO_ISLE_OVERLAY_SOURCE=C:\\path\\to\\isle-overlay-main');
  console.error('or sign in with git/GitHub CLI so the private source can be cloned.');
  process.exit(1);
}
