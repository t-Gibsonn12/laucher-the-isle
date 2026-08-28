class ServerService {
  constructor(serverConfig, onStatus) {
    this.config = serverConfig;
    this.onStatus = onStatus;
    this.timer = null;
  }

  isConfigured() {
    return Boolean(this.config?.host && String(this.config.host).trim());
  }

  async query() {
    if (!this.isConfigured()) {
      const status = {
        configured: false,
        online: false,
        players: null,
        maxPlayers: Number(this.config?.maxPlayers) || 300,
        ping: null,
        name: null,
        map: null,
        version: null,
        connect: null,
        error: 'SERVER_NOT_CONFIGURED'
      };
      this.onStatus?.(status);
      return status;
    }

    try {
      const { GameDig } = await import('gamedig');
      const queryPort = Number(this.config.queryPort || this.config.port || 7777);
      const state = await GameDig.query({
        type: this.config.type || 'tie',
        host: String(this.config.host).trim(),
        port: queryPort,
        socketTimeout: 3500,
        maxRetries: 1
      });

      const players = Array.isArray(state.players)
        ? state.players.length
        : Number(state.numplayers ?? state.raw?.numplayers ?? 0);

      const status = {
        configured: true,
        online: true,
        players: Number.isFinite(players) ? players : 0,
        maxPlayers: Number(state.maxplayers || this.config.maxPlayers || 300),
        ping: Number.isFinite(Number(state.ping)) ? Math.round(Number(state.ping)) : null,
        name: state.name || null,
        map: state.map || null,
        version: state.version || null,
        connect: state.connect || `${this.config.host}:${this.config.port || 7777}`,
        error: null
      };
      this.onStatus?.(status);
      return status;
    } catch (error) {
      const status = {
        configured: true,
        online: false,
        players: 0,
        maxPlayers: Number(this.config.maxPlayers) || 300,
        ping: null,
        name: null,
        map: null,
        version: null,
        connect: `${this.config.host}:${this.config.port || 7777}`,
        error: error?.message || 'QUERY_FAILED'
      };
      this.onStatus?.(status);
      return status;
    }
  }

  start() {
    this.stop();
    this.query();
    const interval = Math.max(15000, Number(this.config.refreshIntervalMs) || 30000);
    this.timer = setInterval(() => this.query(), interval);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = { ServerService };
