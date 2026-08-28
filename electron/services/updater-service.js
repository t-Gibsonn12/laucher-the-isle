const { app } = require('electron');

class UpdaterService {
  constructor(updaterConfig, onStatus) {
    this.config = updaterConfig || {};
    this.onStatus = onStatus;
    this.autoUpdater = null;
    this.ready = false;
  }

  emit(status, extra = {}) {
    const payload = { status, currentVersion: app.getVersion(), ...extra };
    this.onStatus?.(payload);
    return payload;
  }

  init() {
    if (!app.isPackaged) {
      this.ready = true;
      return this.emit('development');
    }

    try {
      const { autoUpdater } = require('electron-updater');
      this.autoUpdater = autoUpdater;
      this.autoUpdater.autoDownload = Boolean(this.config.autoDownload);
      this.autoUpdater.autoInstallOnAppQuit = true;

      this.autoUpdater.on('checking-for-update', () => this.emit('checking'));
      this.autoUpdater.on('update-available', (info) => this.emit('available', {
        version: info.version,
        releaseDate: info.releaseDate || null
      }));
      this.autoUpdater.on('update-not-available', (info) => this.emit('current', {
        version: info.version || app.getVersion()
      }));
      this.autoUpdater.on('download-progress', (progress) => this.emit('downloading', {
        percent: Math.round(progress.percent || 0),
        transferred: progress.transferred || 0,
        total: progress.total || 0
      }));
      this.autoUpdater.on('update-downloaded', (info) => this.emit('downloaded', {
        version: info.version
      }));
      this.autoUpdater.on('error', (error) => this.emit('error', {
        message: error?.message || 'UPDATE_ERROR'
      }));

      this.ready = true;
      return this.emit('idle');
    } catch (error) {
      this.ready = false;
      return this.emit('error', { message: error?.message || 'UPDATER_INIT_FAILED' });
    }
  }

  async check() {
    if (!app.isPackaged) return this.emit('development');
    if (!this.ready) this.init();
    if (!this.autoUpdater) return this.emit('error', { message: 'UPDATER_UNAVAILABLE' });

    try {
      this.emit('checking');
      const result = await this.autoUpdater.checkForUpdates();
      return {
        status: 'checked',
        currentVersion: app.getVersion(),
        version: result?.updateInfo?.version || null
      };
    } catch (error) {
      return this.emit('error', { message: error?.message || 'UPDATE_CHECK_FAILED' });
    }
  }

  async download() {
    if (!app.isPackaged || !this.autoUpdater) return this.emit('development');
    try {
      this.emit('downloading', { percent: 0 });
      await this.autoUpdater.downloadUpdate();
      return this.emit('downloaded');
    } catch (error) {
      return this.emit('error', { message: error?.message || 'UPDATE_DOWNLOAD_FAILED' });
    }
  }

  install() {
    if (!app.isPackaged || !this.autoUpdater) return false;
    setImmediate(() => this.autoUpdater.quitAndInstall(false, true));
    return true;
  }

  scheduleAutoCheck() {
    if (!this.config.autoCheck) return;
    const delay = Math.max(1500, Number(this.config.checkDelayMs) || 5000);
    setTimeout(() => this.check(), delay);
  }
}

module.exports = { UpdaterService };
