(() => {
  const state = { settings: null, modules: [], game: null };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const statusText = (module) => ({
    running: 'ĐANG CHẠY', 'waiting-game': 'CHỜ GAME', ready: 'SẴN SÀNG',
    'not-installed': 'CHƯA CÀI', disabled: 'ĐÃ TẮT', stopped: 'ĐÃ DỪNG', error: 'LỖI'
  }[module?.status] || String(module?.status || 'KHÔNG RÕ').toUpperCase());

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__settingsToastTimer);
    window.__settingsToastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function ensureModal() {
    if ($('#coreSettingsBackdrop')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="coreSettingsBackdrop" class="core-settings-backdrop" aria-hidden="true">
        <section class="core-settings-modal" role="dialog" aria-modal="true" aria-labelledby="coreSettingsTitle">
          <header class="core-settings-head">
            <div><h3 id="coreSettingsTitle">CÀI ĐẶT LAUNCHER</h3><p>System Tray, Module Manager, game detection và diagnostics.</p></div>
            <button id="coreSettingsClose" class="core-settings-close" aria-label="Đóng">×</button>
          </header>
          <div id="coreSettingsBody" class="core-settings-body"></div>
        </section>
      </div>`);
    $('#coreSettingsClose').addEventListener('click', close);
    $('#coreSettingsBackdrop').addEventListener('click', (event) => {
      if (event.target.id === 'coreSettingsBackdrop') close();
    });
  }

  const switchButton = (key, checked, disabled = false, type = 'runtime') =>
    `<button class="switch-btn" type="button" role="switch" aria-checked="${checked ? 'true' : 'false'}" data-switch-type="${type}" data-switch-key="${esc(key)}" ${disabled ? 'disabled' : ''}></button>`;

  const runtimeRow = (key, title, desc, value) =>
    `<div class="setting-row"><div class="setting-copy"><strong>${title}</strong><small>${desc}</small></div>${switchButton(key, value)}</div>`;

  function moduleCard(module) {
    const disabled = !module.available && !module.enabled;
    return `<article class="module-setting-card">
      <div><strong>${esc(module.name)}</strong><p>${esc(module.description)}</p>
        <div class="module-meta"><span class="module-pill ${esc(module.status)}">${statusText(module)}</span><span class="module-pill">v${esc(module.version)}</span><span class="module-pill">${module.requiresGame ? 'THE ISLE' : 'LAUNCHER'}</span></div>
      </div>
      <div class="module-controls">${switchButton(module.id, module.enabled, disabled, 'module')}
        <button class="settings-action module-autostart-btn" data-module-autostart="${esc(module.id)}" ${!module.available ? 'disabled' : ''}>AUTO: ${module.autoStart ? 'ON' : 'OFF'}</button>
      </div>
    </article>`;
  }

  function updateDashboardBadges() {
    const hud = state.modules.find((item) => item.id === 'hud');
    const voice = state.modules.find((item) => item.id === 'voice');
    if ($('.hud-card .soon') && hud) $('.hud-card .soon').textContent = statusText(hud);
    if ($('.voice-card .soon') && voice) $('.voice-card .soon').textContent = statusText(voice);
  }

  function render() {
    const body = $('#coreSettingsBody');
    if (!body || !state.settings) return;
    const runtime = state.settings.runtime || {};
    const game = state.game || state.settings.game || {};
    const gamePath = game.installPath || 'Launcher sẽ tự quét các Steam Library.';

    body.innerHTML = `
      <section class="settings-section">
        <div class="settings-section-title"><h4>CHẠY NỀN & SYSTEM TRAY</h4><span>Core Runtime</span></div>
        <div class="settings-grid">
          ${runtimeRow('closeToTray','Đóng về System Tray','Nút X chỉ ẩn cửa sổ; launcher và module tiếp tục chạy.',runtime.closeToTray !== false)}
          ${runtimeRow('minimizeOnGameStart','Ẩn khi game khởi động','Tự ẩn launcher khi phát hiện process The Isle.',Boolean(runtime.minimizeOnGameStart))}
          ${runtimeRow('restoreOnGameExit','Hiện lại khi thoát game','Tự mở lại launcher sau khi The Isle đóng.',Boolean(runtime.restoreOnGameExit))}
          ${runtimeRow('startWithWindows','Khởi động cùng Windows','Có hiệu lực trên bản .exe đã đóng gói.',Boolean(runtime.startWithWindows))}
        </div>
      </section>
      <section class="settings-section">
        <div class="settings-section-title"><h4>MODULE MANAGER</h4><span>${state.modules.filter((m) => m.status === 'running').length} đang chạy</span></div>
        <div class="module-grid">${state.modules.map(moduleCard).join('')}</div>
      </section>
      <section class="settings-section">
        <div class="settings-section-title"><h4>GAME & CHẨN ĐOÁN</h4><span>${game.installed ? 'ĐÃ TÌM THẤY GAME' : 'CHƯA TÌM THẤY GAME'}</span></div>
        <div class="diagnostic-grid">
          <article class="diagnostic-card"><strong>THE ISLE INSTALLATION</strong><p>${esc(gamePath)}</p><div class="settings-actions"><button id="settingsDetectGame" class="settings-action primary">QUÉT LẠI GAME</button><button id="settingsOpenConfig" class="settings-action">MỞ CONFIG</button></div></article>
          <article class="diagnostic-card"><strong>LAUNCHER DIAGNOSTICS</strong><p>Log tách riêng launcher, game-monitor, server, updater và modules để hỗ trợ fix lỗi nhanh.</p><div class="settings-actions"><button id="settingsOpenLogs" class="settings-action primary">MỞ THƯ MỤC LOG</button></div></article>
        </div>
      </section>`;

    bindControls();
  }

  function bindControls() {
    $$('[data-switch-type="runtime"]').forEach((button) => button.addEventListener('click', async () => {
      const key = button.dataset.switchKey;
      const next = button.getAttribute('aria-checked') !== 'true';
      button.disabled = true;
      try {
        state.settings.runtime = await window.launcher.setRuntimeSetting(key, next);
        render();
        toast('Đã lưu cài đặt launcher.');
      } catch { button.disabled = false; toast('Không thể lưu cài đặt.'); }
    }));

    $$('[data-switch-type="module"]').forEach((button) => button.addEventListener('click', async () => {
      const id = button.dataset.switchKey;
      const next = button.getAttribute('aria-checked') !== 'true';
      button.disabled = true;
      try {
        await window.launcher.setModuleEnabled(id, next);
        state.modules = await window.launcher.getModules();
        updateDashboardBadges(); render();
        toast(`${id}: ${next ? 'đã bật' : 'đã tắt'}.`);
      } catch { button.disabled = false; toast('Không thể thay đổi module.'); }
    }));

    $$('.module-autostart-btn').forEach((button) => button.addEventListener('click', async () => {
      const id = button.dataset.moduleAutostart;
      const module = state.modules.find((item) => item.id === id);
      if (!module) return;
      button.disabled = true;
      try {
        await window.launcher.setModuleAutoStart(id, !module.autoStart);
        state.modules = await window.launcher.getModules();
        render();
      } catch { button.disabled = false; toast('Không thể đổi Auto Start.'); }
    }));

    $('#settingsDetectGame')?.addEventListener('click', async () => {
      state.game = await window.launcher.detectGame();
      render();
      toast(state.game?.installed ? 'Đã tìm thấy The Isle.' : 'Chưa tìm thấy The Isle.');
    });
    $('#settingsOpenConfig')?.addEventListener('click', () => window.launcher.openConfig());
    $('#settingsOpenLogs')?.addEventListener('click', () => window.launcher.openLogs());
  }

  async function open() {
    ensureModal();
    try {
      state.settings = await window.launcher.getSettings();
      state.modules = state.settings.modules || [];
      state.game = state.settings.game || null;
      updateDashboardBadges();
      render();
      $('#coreSettingsBackdrop').classList.add('open');
      $('#coreSettingsBackdrop').setAttribute('aria-hidden', 'false');
    } catch { toast('Không thể tải cài đặt launcher.'); }
  }

  function close() {
    const el = $('#coreSettingsBackdrop');
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('click', (event) => {
    const nav = event.target.closest('.nav-item[data-section="Cài đặt"]');
    const quick = event.target.closest('.settings-open');
    if (!nav && !quick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (nav) {
      document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
      nav.classList.add('active');
    }
    open();
  }, true);

  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  window.launcher?.onModulesStatus((modules) => { state.modules = modules || []; updateDashboardBadges(); if (state.settings) render(); });
  window.launcher?.onGameStatus((game) => { state.game = game; if (state.settings) render(); });

  window.settingsUi = { open, close };
})();
