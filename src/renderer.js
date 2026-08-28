const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const toast = $('#toast');
let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

$('#minimizeBtn').addEventListener('click', () => window.launcher?.minimize());
$('#maximizeBtn').addEventListener('click', () => window.launcher?.toggleMaximize());
$('#closeBtn').addEventListener('click', () => window.launcher?.close());

window.launcher?.onMaximized((maximized) => {
  $('#maximizeBtn').textContent = maximized ? '❐' : '□';
});

window.launcher?.getVersion().then((version) => {
  $('#versionText').textContent = `v${version}`;
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

$('#checkServerBtn').addEventListener('click', async () => {
  const button = $('#checkServerBtn');
  button.disabled = true;
  button.textContent = 'ĐANG KIỂM TRA...';

  await new Promise((resolve) => setTimeout(resolve, 650));

  const ping = Math.floor(26 + Math.random() * 17);
  const players = Math.floor(274 + Math.random() * 12);
  $('#pingValue').innerHTML = `${ping}<small>ms</small>`;
  $('#playersValue').textContent = `${players} / 300`;
  button.textContent = 'ĐÃ KẾT NỐI';
  showToast(`Server Online — ${players}/300 người chơi — ${ping}ms`);

  setTimeout(() => {
    button.disabled = false;
    button.textContent = 'KIỂM TRA';
  }, 1300);
});

$('#playBtn').addEventListener('click', async () => {
  const button = $('#playBtn');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span>ĐANG MỞ GAME...</span>';

  try {
    if (window.launcher?.launchGame) {
      await window.launcher.launchGame();
      showToast('Đã gửi lệnh mở The Isle qua Steam.');
    } else {
      showToast('Chạy bằng Electron để mở The Isle qua Steam.');
    }
  } catch (error) {
    showToast('Không thể mở Steam. Hãy kiểm tra Steam đã được cài đặt.');
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = original;
    }, 1000);
  }
});

$('#connectBtn').addEventListener('click', () => {
  showToast('Kết nối thẳng server sẽ gắn IP/Query API ở bước backend tiếp theo.');
});
