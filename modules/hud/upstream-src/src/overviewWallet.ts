type WalletResp = {
  balance?: number;
  currencyName?: string;
  currencySymbol?: string;
  error?: string;
};

let wallet: WalletResp | null = null;
let syncing = false;

function money(n: number, name?: string, symbol?: string): string {
  const shown = Math.max(0, Math.round(n)).toLocaleString("vi-VN");
  if (symbol) return `${symbol} ${shown}`;
  const currency = !name || name.toLowerCase() === "coins" ? "xu" : name;
  return `${shown} ${currency}`;
}

function injectOverviewWallet() {
  const cards = document.querySelectorAll<HTMLElement>(".idCard");
  for (const card of cards) {
    let box = card.querySelector<HTMLElement>(".yetiOverviewWallet");
    if (!box) {
      box = document.createElement("div");
      box.className = "yetiOverviewWallet";
      box.innerHTML = `
        <span class="yetiOverviewWalletIcon">◎</span>
        <span class="yetiOverviewWalletMeta">
          <span class="yetiOverviewWalletLabel">SỐ DƯ</span>
          <strong class="yetiOverviewWalletValue">—</strong>
        </span>
      `;
      card.appendChild(box);
    }
    const value = box.querySelector<HTMLElement>(".yetiOverviewWalletValue");
    if (value && typeof wallet?.balance === "number") {
      value.textContent = money(wallet.balance, wallet.currencyName, wallet.currencySymbol);
    }
  }
}

async function syncWallet() {
  if (syncing || !window.isleOverlay?.apiGet) return;
  syncing = true;
  try {
    const r = (await window.isleOverlay.apiGet<WalletResp>("/api/overlay/shop")) as WalletResp;
    if (!r?.error && typeof r?.balance === "number") wallet = r;
  } catch {
    // Keep the last known balance if the API is briefly unavailable.
  } finally {
    syncing = false;
    injectOverviewWallet();
  }
}

export function installOverviewWallet() {
  if (window.location.hash.replace(/^#/, "").startsWith("radar")) return;

  const observer = new MutationObserver(injectOverviewWallet);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.setTimeout(injectOverviewWallet, 0);
  window.setTimeout(() => void syncWallet(), 500);
  window.setInterval(() => void syncWallet(), 10000);
}
