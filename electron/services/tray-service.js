const { Menu, Tray, nativeImage } = require('electron');

function createTrayImage() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#0b120d"/>
    <path d="M13 43c9-2 15-11 17-24 8 4 14 10 20 18-4-1-7-1-10 0 4 4 6 8 7 13-8-6-16-8-24-5-4 1-7 1-10-2z" fill="#8aa66e"/>
    <circle cx="37" cy="25" r="2.5" fill="#e7ece5"/>
  </svg>`;
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return nativeImage.createFromDataURL(dataUrl).resize({ width: 32, height: 32 });
}

class TrayService {
  constructor({ onShow, onHide, onLaunchGame, onQuit, onToggleModule, logger }) {
    this.onShow = onShow;
    this.onHide = onHide;
    this.onLaunchGame = onLaunchGame;
    this.onQuit = onQuit;
    this.onToggleModule = onToggleModule;
    this.logger = logger;
    this.tray = null;
    this.gameStatus = { running: false };
    this.modules = [];
  }

  init() {
    if (this.tray) return this.tray;
    this.tray = new Tray(createTrayImage());
    this.tray.setToolTip('Dino Community Launcher');
    this.tray.on('click', () => this.onShow?.());
    this.rebuildMenu();
    this.logger?.info?.('System tray initialized');
    return this.tray;
  }

  setGameStatus(status = {}) {
    this.gameStatus = status;
    this.rebuildMenu();
  }

  setModules(modules = []) {
    this.modules = modules;
    this.rebuildMenu();
  }

  rebuildMenu() {
    if (!this.tray) return;
    const gameLabel = this.gameStatus?.running ? 'The Isle: Đang chạy' : 'The Isle: Chưa chạy';
    const moduleItems = this.modules.map((module) => ({
      label: `${module.enabled ? '✓' : '○'} ${module.name} — ${module.detail}`,
      enabled: module.available || module.enabled,
      click: () => this.onToggleModule?.(module.id, !module.enabled)
    }));

    const menu = Menu.buildFromTemplate([
      { label: 'Mở Dino Community Launcher', click: () => this.onShow?.() },
      { label: gameLabel, enabled: false },
      { label: 'Chơi The Isle', enabled: !this.gameStatus?.running, click: () => this.onLaunchGame?.() },
      { type: 'separator' },
      {
        label: 'Modules',
        submenu: moduleItems.length ? moduleItems : [{ label: 'Chưa có module', enabled: false }]
      },
      { type: 'separator' },
      { label: 'Ẩn launcher', click: () => this.onHide?.() },
      { label: 'Thoát hoàn toàn', click: () => this.onQuit?.() }
    ]);

    this.tray.setContextMenu(menu);
  }

  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}

module.exports = { TrayService };
