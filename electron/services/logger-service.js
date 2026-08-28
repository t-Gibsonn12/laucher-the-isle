const fs = require('fs');
const path = require('path');

function safeMeta(meta) {
  if (meta === undefined) return '';
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' {"meta":"unserializable"}';
  }
}

class LoggerService {
  constructor(rootDir) {
    this.rootDir = rootDir;
    try {
      fs.mkdirSync(rootDir, { recursive: true });
    } catch {
      // Logging must never prevent the launcher from starting.
    }
  }

  write(scope, level, message, meta) {
    const stamp = new Date().toISOString();
    const line = `[${stamp}] [${String(level).toUpperCase()}] [${scope}] ${message}${safeMeta(meta)}\n`;
    try {
      fs.appendFileSync(path.join(this.rootDir, `${scope}.log`), line, 'utf8');
      if (scope !== 'launcher') {
        fs.appendFileSync(path.join(this.rootDir, 'launcher.log'), line, 'utf8');
      }
    } catch {
      // Ignore IO failures; the app should keep working without logs.
    }
  }

  child(scope) {
    return {
      info: (message, meta) => this.write(scope, 'info', message, meta),
      warn: (message, meta) => this.write(scope, 'warn', message, meta),
      error: (message, meta) => this.write(scope, 'error', message, meta),
      debug: (message, meta) => this.write(scope, 'debug', message, meta)
    };
  }
}

module.exports = { LoggerService };
