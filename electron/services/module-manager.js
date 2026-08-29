const fs = require('fs');
const path = require('path');

const DEFINITIONS = [
  {
    id: 'game-bridge',
    name: 'Game Bridge',
    description: 'Theo dõi trạng thái The Isle và làm cầu nối dữ liệu cho HUD/Voice.',
    requiresGame: true,
    builtIn: true,
    version: '0.2.0'
  },
  {
    id: 'hud',
    name: 'HUD Overlay',
    description: 'HUD nguyên bản từ isle-overlay-main: Stats, Prime, Radar/mini map, dashboard và cài đặt widget.',
    // HUD phải khởi động cùng launcher để F8/F9 và dashboard luôn sẵn sàng.
    // Các widget gameplay vẫn tự ẩn ngoài phiên chơi nhờ gameplayVisibility của HUD gốc.
    requiresGame: false,
    builtIn: false,
    version: '0.4.1-upstream'
  },
  {
    id: 'voice',
    name: 'Proximity Voice',
    description: 'Engine voice 3D/proximity chạy nền cùng game.',
    requiresGame: true,
    builtIn: false,
    version: '0.0.0'
  },
  {
    id: 'discord',
    name: 'Discord Integration',
    description: 'Discord presence/account bridge cho launcher và server.',
    requiresGame: false,
    builtIn: false,
    version: '0.0.0'
  }
];

class ModuleManager {
  constructor({ appRoot, config = {}, onStatus, onConfigChange, logger, context = {} }) {
    this.appRoot = appRoot;
    this.config = config;
    this.onStatus = onStatus;
    this.onConfigChange = onConfigChange;
    this.logger = logger;
    this.gameRunning = false;
    this.context = { ...context };
    this.states = new Map();
    this.controllers = new Map();
  }

  init() {
    for (const def of DEFINITIONS) {
      this.states.set(def.id, this.buildInitialState(def));
      this.loadExternalController(def);
    }
    this.reconcile(false);
    return this.getSnapshot();
  }

  buildInitialState(def) {
    const settings = this.config?.[def.id] || {};
    return {
      ...def,
      enabled: settings.enabled ?? (def.id === 'game-bridge'),
      autoStart: settings.autoStart ?? true,
      available: Boolean(def.builtIn),
      status: 'stopped',
      detail: def.builtIn ? 'Sẵn sàng' : 'Chưa cài module',
      error: null
    };
  }

  loadExternalController(def) {
    if (def.builtIn) return;
    const entry = path.join(this.appRoot, 'modules', def.id, 'index.js');
    if (!fs.existsSync(entry)) return;

    try {
      // Modules are trusted launcher files shipped through the signed updater/release package.
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const loaded = require(entry);
      const controller = typeof loaded.create === 'function'
        ? loaded.create({
            logger: this.logger,
            appRoot: this.appRoot,
            getContext: () => ({ ...this.context })
          })
        : loaded;
      this.controllers.set(def.id, controller || {});
      const state = this.states.get(def.id);
      state.available = true;
      state.version = loaded.version || state.version;
      state.detail = 'Đã cài đặt';
      this.states.set(def.id, state);
      controller?.updateContext?.({ ...this.context });
    } catch (error) {
      const state = this.states.get(def.id);
      state.available = false;
      state.status = 'error';
      state.error = error.message;
      state.detail = 'Không thể tải module';
      this.states.set(def.id, state);
      this.logger?.error?.(`Không thể tải module ${def.id}`, { message: error.message });
    }
  }

  updateContext(patch = {}) {
    this.context = { ...this.context, ...patch };
    for (const [id, controller] of this.controllers.entries()) {
      try {
        controller?.updateContext?.({ ...this.context });
      } catch (error) {
        this.logger?.warn?.(`Module ${id} rejected runtime context`, { message: error.message });
      }
    }
    return { ...this.context };
  }

  updateConfig(config = {}) {
    this.config = config;
    for (const def of DEFINITIONS) {
      const state = this.states.get(def.id) || this.buildInitialState(def);
      const settings = config?.[def.id] || {};
      state.enabled = settings.enabled ?? state.enabled;
      state.autoStart = settings.autoStart ?? state.autoStart;
      this.states.set(def.id, state);
    }
    this.reconcile(this.gameRunning);
  }

  getSnapshot() {
    return [...this.states.values()].map((state) => ({ ...state }));
  }

  emit() {
    this.onStatus?.(this.getSnapshot());
  }

  async setEnabled(id, enabled) {
    const state = this.states.get(id);
    if (!state) throw new Error(`Unknown module: ${id}`);

    state.enabled = Boolean(enabled);
    this.config[id] = { ...(this.config[id] || {}), enabled: state.enabled };
    this.states.set(id, state);
    this.onConfigChange?.(this.config);
    this.logger?.info?.(`Module ${id} ${state.enabled ? 'enabled' : 'disabled'}`);
    await this.reconcile(this.gameRunning);
    return { ...this.states.get(id) };
  }

  async setAutoStart(id, autoStart) {
    const state = this.states.get(id);
    if (!state) throw new Error(`Unknown module: ${id}`);
    state.autoStart = Boolean(autoStart);
    this.config[id] = { ...(this.config[id] || {}), autoStart: state.autoStart };
    this.states.set(id, state);
    this.onConfigChange?.(this.config);
    await this.reconcile(this.gameRunning);
    return { ...this.states.get(id) };
  }

  async start(id) {
    const state = this.states.get(id);
    if (!state || !state.enabled) return state;

    if (!state.available) {
      state.status = 'not-installed';
      state.detail = 'Chưa cài module';
      this.states.set(id, state);
      return state;
    }

    if (state.requiresGame && !this.gameRunning) {
      state.status = 'waiting-game';
      state.detail = 'Chờ The Isle khởi động';
      this.states.set(id, state);
      return state;
    }

    if (state.status === 'running') return state;

    try {
      const controller = this.controllers.get(id);
      if (controller?.start) await controller.start({ context: { ...this.context } });
      state.status = 'running';
      state.detail = state.builtIn ? 'Đang hoạt động' : 'Module đang chạy';
      state.error = null;
      this.logger?.info?.(`Module ${id} started`);
    } catch (error) {
      state.status = 'error';
      state.detail = 'Lỗi khi khởi động';
      state.error = error.message;
      this.logger?.error?.(`Module ${id} start failed`, { message: error.message });
    }

    this.states.set(id, state);
    return state;
  }

  async stop(id, detail = 'Đã dừng') {
    const state = this.states.get(id);
    if (!state) return null;

    try {
      const controller = this.controllers.get(id);
      if (state.status === 'running' && controller?.stop) await controller.stop();
    } catch (error) {
      this.logger?.warn?.(`Module ${id} stop failed`, { message: error.message });
    }

    state.status = state.enabled ? 'stopped' : 'disabled';
    state.detail = state.enabled ? detail : 'Đã tắt';
    this.states.set(id, state);
    return state;
  }

  async reconcile(gameRunning) {
    this.gameRunning = Boolean(gameRunning);

    for (const def of DEFINITIONS) {
      const state = this.states.get(def.id);
      if (!state) continue;

      if (!state.enabled) {
        await this.stop(def.id);
        continue;
      }

      if (!state.available) {
        state.status = 'not-installed';
        state.detail = 'Chưa cài module';
        this.states.set(def.id, state);
        continue;
      }

      if (!state.autoStart) {
        if (state.status !== 'running') {
          state.status = 'ready';
          state.detail = 'Sẵn sàng khởi động thủ công';
          this.states.set(def.id, state);
        }
        continue;
      }

      if (state.requiresGame && !this.gameRunning) {
        await this.stop(def.id, 'Chờ The Isle khởi động');
        const current = this.states.get(def.id);
        current.status = 'waiting-game';
        current.detail = 'Chờ The Isle khởi động';
        this.states.set(def.id, current);
        continue;
      }

      await this.start(def.id);
    }

    this.emit();
    return this.getSnapshot();
  }

  async shutdown() {
    for (const def of DEFINITIONS) {
      await this.stop(def.id, 'Launcher đang thoát');
    }
    this.emit();
  }
}

module.exports = { ModuleManager, DEFINITIONS };
