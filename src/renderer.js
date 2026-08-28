const settingsStyleLink = document.createElement('link');
settingsStyleLink.rel = 'stylesheet';
settingsStyleLink.href = './settings.css';
document.head.appendChild(settingsStyleLink);

const settingsUiScript = document.createElement('script');
settingsUiScript.src = './settings-ui.js';
document.body.appendChild(settingsUiScript);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const toast = $('#toast');
const playButton = $('#playBtn');
const checkServerButton = $('#checkServerBtn');
const versionText = $('#versionText');

let toastTimer;
let latestServerStatus = null;
let latestGameStatus = null;
let latestUpdaterStatus = null;
let currentVersion = '0.0.0';
let serverBusy = false;

function showToast(message, duration = 2600) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

function playMarkup(label) {
  return `<span>${label}</span><svg><use href="#i-play"/></svg>`;
}

function setDotState(state) {
  const dot = $('.online-dot');
  if (!dot) return;

  if (state === 'online') {
    dot.style.background = '#79a964';
    dot.style.boxShadow = '0 0 10px rgba(121,169,100,.42)';
  } else if (state === 'checking') {
    dot.style.background = '#9d9569';
    dot.style.boxShadow = '0 0 8px rgba(157,149,105,.28)';
  } else {
    dot.style.background = '#6d7470';
    dot.style.boxShadow = 'none';
  }
}

function renderServerStatus(status) {
  latestServerStatus = status;
  const statusLabel = $('.status-copy strong');
  const maxPlayers = Number(status?.maxPlayers || 300);

  if (!status?.configured) {
    statusLabel.innerHTML = '<i class="online-dot"></i> CHƯA CẤU HÌNH';
    setDotState('offline');
    $('#playersValue').textContent = `-- / ${maxPlayers}`;
    $('#pingValue').innerHTML = '--<small>ms</small>';
    if (!serverBusy) checkServerButton.textContent = 'CẤU HÌNH';
    return;
  }

  if (status.online) {
    statusLabel.innerHTML = '<i class="online-dot"></i> ONLINE';
    setDotState('online');
    $('#playersValue').textContent = `${status.players ?? 0} / ${maxPlayers}`;
    $('#pingValue').innerHTML = `${status.ping ?? '--'}<small>ms</small>`;
    if (!serverBusy) checkServerButton.textContent = 'KIỂM TRA';
    return;
  }

  statusLabel.innerHTML = '<i class="online-dot"></i> OFFLINE';
  setDotState('offline');
  $('#playersValue').textContent = `0 / ${maxPlayers}`;
  $('#pingValue').innerHTML = '--<small>ms</small>';
  if (!serverBusy) checkServerButton.textContent = 'THỬ LẠI';
}

function renderGameStatus(status, { announce = false } = {}) {
  const wasRunning = latestGameStatus?.running;
  latestGameStatus = status;

  if (status?.running) {
    playButton.disabled = true;
    playButton.innerHTML = playMarkup('ĐANG CHƠI');
    playButton.title = status.processName || 'The Isle đang chạy';
    if (announce && !wasRunning) showToast('The Isle đã khởi động — Game Monitor đang theo dõi.');
    return;
  }

  playButton.disabled = false;
  playButton.innerHTML = playMarkup('CHƠI NGAY');
  if (status?.installed) {
    playButton.title = status.installPath ? `Đã tìm thấy: ${status.installPath}` : 'Đã tìm thấy The Isle';
    if (announce && wasRunning) showToast('The Isle đã đóng — launcher đã nhận trạng thái.');
  } else {
    playButton.title = 'Chưa tự động tìm thấy The Isle; Steam vẫn có thể mở/cài game.';
  }
}

function renderUpdaterStatus(status) {
  if (!status) return;
  latestUpdaterStatus = status;

  const base = `v${currentVersion}`;
  versionText.style.cursor = 'pointer';

  if (status.status === 'development') {
    versionText.textContent = `${base} · DEV`;
    versionText.title = 'Auto Update hoạt động sau khi đóng gói bản Windows.';
  } else if (status.status === 'checking') {
    versionText.textContent = `${base} · ĐANG KIỂM TRA`;
    versionText.title = 'Đang kiểm tra bản cập nhật';
  } else if (status.status === 'available') {
    versionText.textContent = `${base} · CÓ v${status.version}`;
    versionText.title = 'Nhấp để tải bản cập nhật';
    showToast(`Có bản launcher v${status.version}. Nhấp phiên bản ở cuối cửa sổ để tải.`, 4200);
  } else if (status.status === 'downloading') {
    versionText.textContent = `${base} · TẢI ${status.percent ?? 0}%`;
    versionText.title = 'Đang tải bản cập nhật';
  } else if (status.status === 'downloaded') {
    versionText.textContent = `${base} · CÀI BẢN MỚI`;
    versionText.title = 'Nhấp để cài và khởi động lại launcher';
    showToast('Bản cập nhật đã tải xong. Nhấp phiên bản ở cuối để cài đặt.', 4200);
  } else if (status.status === 'error') {
    versionText.textContent = `${base} · UPDATE LỖI`;
    versionText.title = status.message || 'Không thể kiểm tra cập nhật';
  } else {
    versionText.textContent = base;
    versionText.title = 'Nhấp để kiểm tra cập nhật';
  }
}

async function refreshServer({ manual = false } = {}) {
  if (!window.launcher?.queryServer || serverBusy) return latestServerStatus;

  serverBusy = true;
  checkServerButton.disabled = true;
  checkServerButton.textContent = 'ĐANG KIỂM TRA...';
  setDotState('checking');

  try {
    const status = await window.launcher.queryServer();
    renderServerStatus(status);

    if (manual) {
      if (!status.configured) {
        showToast('Chưa có IP server. Mình sẽ mở file cấu hình launcher.');
        await window.launcher.openConfig?.();
      } else if (status.online) {
        showToast(`Server Online — ${status.players ?? 0}/${status.maxPlayers ?? 300} người chơi — ${status.ping ?? '--'}ms`);
      } else {
        showToast('Không query được server. Kiểm tra IP, Query Port và firewall UDP.');
      }
    }

    return status;
  } catch (error) {
    if (manual) showToast('Lỗi khi query server The Isle.');
    return null;
  } finally {
    serverBusy = false;
    checkServerButton.disabled = false;
    if (latestServerStatus) renderServerStatus(latestServerStatus);
  }
}

async function refreshGame({ announce = false, forceDetect = false } = {}) {
  if (!window.launcher) return null;
  try {
    const status = forceDetect
      ? await window.launcher.detectGame?.()
      : await window.launcher.getGameStatus?.();
    if (status) renderGameStatus(status, { announce });
    return status;
  } catch {
    return null;
  }
}

$('#minimizeBtn').addEventListener('click', () => window.launcher?.minimize());
$('#maximizeBtn').addEventListener('click', () => window.launcher?.toggleMaximize());
$('#closeBtn').addEventListener('click', () => window.launcher?.close());

window.launcher?.onMaximized((maximized) => {
  $('#maximizeBtn').textContent = maximized ? '❐' : '□';
});

window.launcher?.onGameStatus((status) => renderGameStatus(status, { announce: true }));
window.launcher?.onServerStatus((status) => renderServerStatus(status));
window.launcher?.onUpdaterStatus((status) => renderUpdaterStatus(status));

window.launcher?.getVersion().then((version) => {
  currentVersion = version;
  renderUpdaterStatus(latestUpdaterStatus || { status: 'idle' });
}).catch(() => {});

$$('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    $$('.nav-item').forEach((nav) => nav.classList.remove('active'));
    item.classList.add('active');
    if (item.dataset.section !== 'Trang chủ') {
      showToast(`${item.dataset.section}: sẽ hoàn thiện ở giai đoạn tiếp theo.`);
    }
  });
});

$$('[data-toast]').forEach((button) => {
  button.addEventListener('click', () => showToast(button.dataset.toast));
});

checkServerButton.addEventListener('click', () => refreshServer({ manual: true }));

playButton.addEventListener('click', async () => {
  if (latestGameStatus?.running) return;

  const original = playButton.innerHTML;
  playButton.disabled = true;
  playButton.innerHTML = '<span>ĐANG MỞ GAME...</span>';

  try {
    const result = await window.launcher?.launchGame?.();
    if (result?.alreadyRunning) {
      renderGameStatus(result.status || { running: true });
      showToast('The Isle đang chạy.');
      return;
    }

    if (result?.status?.installed === false) {
      showToast('Không tìm thấy thư mục The Isle, nhưng đã gửi lệnh cho Steam mở/cài game.', 3400);
    } else {
      showToast('Đã gửi lệnh mở The Isle qua Steam. Đang chờ process game...');
    }

    setTimeout(() => refreshGame({ announce: true, forceDetect: true }), 3500);
  } catch (error) {
    showToast('Không thể mở Steam. Hãy kiểm tra Steam đã được cài đặt.');
  } finally {
    if (!latestGameStatus?.running) {
      playButton.disabled = false;
      playButton.innerHTML = original;
    }
  }
});

$('#connectBtn').addEventListener('click', async () => {
  const status = await refreshServer();
  if (!status?.configured) {
    showToast('Cần cấu hình IP/Query Port server trước.');
    await window.launcher?.openConfig?.();
    return;
  }
  if (!status.online) {
    showToast('Server đang offline hoặc không trả lời query.');
    return;
  }

  showToast(`Server sẵn sàng (${status.players}/${status.maxPlayers}). Đang mở The Isle...`);
  try {
    await window.launcher?.launchGame?.();
  } catch {
    showToast('Không thể mở The Isle qua Steam.');
  }
});

versionText.addEventListener('click', async () => {
  if (!window.launcher?.checkForUpdates) return;

  if (latestUpdaterStatus?.status === 'available') {
    showToast('Bắt đầu tải bản cập nhật launcher...');
    await window.launcher.downloadUpdate?.();
    return;
  }

  if (latestUpdaterStatus?.status === 'downloaded') {
    showToast('Launcher sẽ khởi động lại để cài bản mới.');
    await window.launcher.installUpdate?.();
    return;
  }

  const result = await window.launcher.checkForUpdates();
  if (result?.status === 'development') {
    showToast('Auto Update chỉ hoạt động trên bản launcher .exe đã đóng gói.');
  } else if (result?.status === 'checked' && result.version === currentVersion) {
    showToast('Bạn đang dùng phiên bản launcher mới nhất.');
  }
});

(async function initializeCore() {
  await Promise.all([
    refreshGame({ forceDetect: true }),
    refreshServer()
  ]);
})();
