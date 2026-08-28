const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function merge(base, override) {
  const output = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof base?.[key] === 'object' && !Array.isArray(base[key])) {
      output[key] = merge(base[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function getConfigPaths() {
  return {
    bundledPath: path.join(app.getAppPath(), 'config', 'launcher.config.json'),
    userPath: path.join(app.getPath('userData'), 'launcher.config.json')
  };
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function loadConfig() {
  const { bundledPath, userPath } = getConfigPaths();
  const defaults = readJson(bundledPath);
  const user = readJson(userPath);
  const config = merge(defaults, user);

  if (process.env.DINO_SERVER_HOST) config.server.host = process.env.DINO_SERVER_HOST;
  if (process.env.DINO_SERVER_PORT) config.server.port = Number(process.env.DINO_SERVER_PORT);
  if (process.env.DINO_QUERY_PORT) config.server.queryPort = Number(process.env.DINO_QUERY_PORT);

  try {
    if (!fs.existsSync(userPath)) writeJsonAtomic(userPath, config);
  } catch {
    // The launcher can continue with bundled defaults even if userData is not writable.
  }

  return { config, userPath, bundledPath };
}

function saveConfig(config) {
  const { userPath } = getConfigPaths();
  writeJsonAtomic(userPath, config);
  return userPath;
}

module.exports = { loadConfig, saveConfig, merge, getConfigPaths };
