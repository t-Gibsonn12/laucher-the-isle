(() => {
  const bridge = window.isleOverlay;
  const $ = (id) => document.getElementById(id);
  const dashboard = $('dashboard');
  const statRows = $('stat-rows');
  let me = null;
  let live = null;
  let state = { gameDetected: false };

  const clamp = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : fallback;
  };

  const percent = (value, max, fallback) => {
    const current = Number(value);
    const total = Number(max);
    return Number.isFinite(current) && Number.isFinite(total) && total > 0
      ? clamp((current / total) * 100, fallback)
      : clamp(current, fallback);
  };

  function render() {
    const online = Boolean(live?.hasDino || me?.online || state.gameDetected);
    $('signal').classList.toggle('online', online);
    $('status-label').textContent = online ? 'THE ISLE ĐÃ KẾT NỐI' : 'HUD ĐANG CHỜ GAME';
    $('radar-status').textContent = online ? 'TRỰC TUYẾN' : 'CHỜ GAME';
    $('species').textContent = me?.species || (online ? 'DINOSAUR' : 'ĐANG CHỜ');
    $('dash-state').textContent = online
      ? `Đã kết nối The Isle${me?.species ? ` · ${me.species}` : ''}. HUD đang hoạt động.`
      : 'Chờ launcher nhận tiến trình The Isle…';

    const values = [
      ['MÁU', percent(live?.health ?? me?.health, live?.maxHealth ?? me?.maxHealth, 100), '#ff6969'],
      ['THỂ LỰC', percent(live?.stamina ?? me?.stamina, live?.maxStamina ?? me?.maxStamina, 82), '#59e2ac'],
      ['ĐÓI', percent(live?.hunger ?? me?.hunger, live?.maxHunger ?? me?.maxHunger, 76), '#ffbc62'],
      ['NƯỚC', percent(live?.thirst ?? me?.thirst, live?.maxThirst ?? me?.maxThirst, 88), '#69c7ff'],
      ['GROW', clamp((live?.growth ?? me?.growth ?? .96) * 100, 96), '#b49cff'],
    ];
    statRows.replaceChildren(...values.map(([name, value, color]) => {
      const row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML = `<span>${name}</span><span class="bar"><i style="width:${Math.round(value)}%;background:${color}"></i></span><b>${Math.round(value)}%</b>`;
      return row;
    }));

    const prime = me?.prime;
    $('prime-count').textContent = `${prime?.done ?? 0}/${prime?.required ?? 5}`;
    $('prime-status').innerHTML = prime?.elder
      ? '<strong>Prime Elder</strong> · nhân vật đã hoàn tất Prime.'
      : prime ? `<strong>${prime.eligible ? 'Đủ điều kiện Prime' : 'Đang hoàn thành Prime'}</strong><br>${prime.done ?? 0}/${prime.required ?? 5} điều kiện cần thiết.`
      : 'Đang đọc dữ liệu nhân vật…';

    const yaw = Number(live?.position?.yaw ?? 0);
    $('radar-arrow').style.transform = `rotate(${Number.isFinite(yaw) ? yaw : 0}deg)`;
  }

  async function refresh() {
    try { me = await bridge.apiGet('/api/overlay/me'); } catch {}
    try {
      const map = await bridge.apiGet('/api/overlay/map');
      if (map?.markers?.some((marker) => marker?.self)) state.gameDetected = true;
    } catch {}
    render();
  }

  bridge.onLive((frame) => { live = frame; render(); });
  bridge.onState((next) => { state = { ...state, ...next }; render(); });
  bridge.onDash((open) => { dashboard.hidden = !open; render(); });
  $('close-dashboard').addEventListener('click', () => bridge.setDashOpen(false));
  $('status-pill').addEventListener('click', () => bridge.setDashOpen(dashboard.hidden));
  refresh();
  window.setInterval(refresh, 2500);
})();
