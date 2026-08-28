const { Menu, Tray, nativeImage } = require('electron');

// Embedded PNG is intentional: Windows tray icons are more reliable with raster
// data than SVG data URLs when running unpackaged through Electron.
const TRAY_ICON_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACn0lEQVR4nO1bsU4DMQw1iI9AYuEf7h+6MCKh7jcwdEBib4d2R2LowNAdITGy8A/8AwsSfwHToVwuie3Ezvm4vrXXJO/52ec2CcAR88ZJzcnuHm5+qM8+3r9UWZvqJBzCGLQEURlUkrgPaSHEBqOQftq9kce7XV+hz0iIISJAjDyHMIaYIKUiFH25BnEf0kJkCxAir0ncR0iIHBGyBPDJ1yTuwxeCK8Ipd0JL5EPzc99ALAGske9QIgLZLu6gVoiH4KYEJR1IDpgKeYD++ihOQAXQ7OpqAFt/UgCrOY+BUxPIRVCD/OF1Jz5mB+p6o0VCO++3+xYuzi/R59rrddE8WFEMCqBp/e2+BQAgkacAEwhrlNAU0CAvBYo7sPWzO8FcSJOXwkAAjdz3yVPsv2iWsGiW0c85tSHVG5yRR8lAbtRd4otmCe8fz73PSwuji54DJKOvZflc8jEXVKsBHLgR96MvDZUUSEWf+voLEZe0fgfVGlCKr+9P9Tn+mgKp/MdyP+UALuHN6sB6HmDYGVZ1QIh8SZRdsXPEABBOAUrl17B1LnmAym8Ba+QBjBfBFEqJdxBzQM1eX4o8gNFGKAVJ8gBCKZAbfQ6Z7b4VJw8wogO4ZDTIAwgIYPV3PhWjOEArmjno/T9W0g5TnTAm+dAfpGJ9gEssJoalyHdQSYHN6mCSbAiqNcAVwqogg32B3DpQ421QImJsg2RynaA0BgK46lCOqk0Bqe2xowOwB6buAmz9o+0O1wK2Oxx1wH+oBZTzQuQaMDURqOtNCuCrNhUROIcnUQfUurigBWz9pBSYUj3gnhNkRdfyqbHcM8OsRshqTSg5MM3uBK2JUHpa/HhfoGQRs74x4mK2d4ZczPrWmI9Z3hsMYbY3R2OweHd49vgFSjhXmkM4Ka0AAAAASUVORK5CYII=';

function createTrayImage() {
  const image = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_PNG_BASE64}`);
  if (image.isEmpty()) throw new Error('Tray icon image could not be decoded');
  return image.resize({ width: 24, height: 24, quality: 'best' });
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
    this.hiddenBalloonShown = false;
  }

  init() {
    if (this.tray) return this.tray;

    try {
      this.tray = new Tray(createTrayImage());
      this.tray.setToolTip('Dino Community Launcher');
      this.tray.on('click', () => this.onShow?.());
      this.tray.on('double-click', () => this.onShow?.());
      this.rebuildMenu();
      this.logger?.info?.('System tray initialized', { platform: process.platform });
      return this.tray;
    } catch (error) {
      this.logger?.error?.('System tray initialization failed', { message: error.message });
      this.tray = null;
      throw error;
    }
  }

  notifyHidden() {
    if (!this.tray || this.hiddenBalloonShown || process.platform !== 'win32') return;
    this.hiddenBalloonShown = true;

    try {
      this.tray.displayBalloon({
        title: 'Dino Community Launcher',
        content: 'Launcher vẫn đang chạy nền. Nhấp biểu tượng ở khay hệ thống để mở lại.',
        iconType: 'info',
        noSound: true
      });
    } catch (error) {
      this.logger?.warn?.('Could not display tray balloon', { message: error.message });
    }
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
