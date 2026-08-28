const STORAGE_KEY = "yeti.widgetAppearance.v1";

const DEFAULTS = {
  backgroundOpacity: 0.34,
  scale: 1,
  compact: false,
};

type WidgetAppearance = typeof DEFAULTS;
type PrimeQuestLite = { name: string; done: boolean };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizePrimeQuest(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function translatePrimeQuest(name: string): string {
  const n = normalizePrimeQuest(name);
  if (n.includes("visit a sanctuary") && n.includes("juvenile")) return "Ghé Khu bảo tồn khi còn con non";
  if (n.includes("get nested in")) return "Được sinh ra từ tổ";
  if (n.includes("get perfect diet")) return "Đạt chế độ ăn hoàn hảo (mỗi loại 1%)";
  if (n.includes("visit mass migration")) return "Ghé Khu Di cư lớn";
  if (n.includes("visit 2 migration")) return "Ghé 2 Khu Di cư";
  if (n.includes("visit 4 patrol")) return "Ghé 4 Khu Tuần tra";
  if (n.includes("never be infertile")) return "Không bao giờ bị vô sinh";
  if (n.includes("never get muscle spasms")) return "Không bao giờ bị co thắt cơ";
  if (n.includes("raise children to subadult")) return "Nuôi con đến giai đoạn cận trưởng thành";
  if (n.includes("be a hypsi") && n.includes("troodon") && n.includes("beipi")) {
    return "Chơi Hypsi, Troodon, Beipi, Dryo hoặc Deino";
  }
  return name;
}

function translateQuestList(root: ParentNode, selector: string) {
  const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
  for (const li of items) {
    const textEl = Array.from(li.querySelectorAll<HTMLElement>("span")).find(
      (el) => !el.classList.contains("qbox") && !el.classList.contains("mark"),
    );
    if (textEl) {
      const current = textEl.textContent ?? "";
      const translated = translatePrimeQuest(current);
      if (translated !== current) textEl.textContent = translated;
      continue;
    }

    const textNode = Array.from(li.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && Boolean((node.textContent ?? "").trim()),
    );
    if (!textNode) continue;
    const current = (textNode.textContent ?? "").trim();
    const translated = translatePrimeQuest(current);
    if (translated !== current) textNode.textContent = ` ${translated}`;
  }
}

function syncPrimeTranslations() {
  translateQuestList(document, ".primeFrame .primeList li");
  translateQuestList(document, ".primeWrap .condList li");
}

function readAppearance(): WidgetAppearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<WidgetAppearance>;
    return {
      backgroundOpacity:
        typeof parsed.backgroundOpacity === "number" && Number.isFinite(parsed.backgroundOpacity)
          ? clamp(parsed.backgroundOpacity, 0.08, 0.85)
          : DEFAULTS.backgroundOpacity,
      scale:
        typeof parsed.scale === "number" && Number.isFinite(parsed.scale)
          ? clamp(parsed.scale, 0.7, 1.5)
          : DEFAULTS.scale,
      compact: parsed.compact === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveAppearance(next: WidgetAppearance) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function applyAppearance(next: WidgetAppearance) {
  const root = document.documentElement;
  root.style.setProperty("--yeti-widget-bg-alpha", String(next.backgroundOpacity));
  root.style.setProperty("--yeti-widget-scale", String(next.scale));
  root.classList.toggle("yeti-compact-hud", next.compact);
}

function makeRange(args: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const wrap = document.createElement("div");
  wrap.className = "yetiWidgetControl";

  const head = document.createElement("div");
  head.className = "yetiWidgetControlHead";

  const title = document.createElement("span");
  title.textContent = args.label;

  const value = document.createElement("span");
  value.className = "yetiWidgetControlValue";
  value.textContent = args.format(args.value);

  head.append(title, value);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = args.hint;

  const input = document.createElement("input");
  input.type = "range";
  input.className = "range interactive-region";
  input.min = String(args.min);
  input.max = String(args.max);
  input.step = String(args.step);
  input.value = String(args.value);
  input.addEventListener("input", () => {
    const n = Number(input.value);
    value.textContent = args.format(n);
    args.onChange(n);
  });

  wrap.append(head, hint, input);
  return wrap;
}

function buildControls() {
  let current = readAppearance();

  const box = document.createElement("div");
  box.dataset.yetiWidgetControls = "1";
  box.className = "yetiWidgetAppearance interactive-region";

  const title = document.createElement("div");
  title.className = "secLabel yetiWidgetTitle";
  title.textContent = "tùy chỉnh widget nổi";

  const intro = document.createElement("div");
  intro.className = "hint";
  intro.textContent = "Chỉnh nền, kích thước và bố cục gọn cho bảng Chỉ số + Prime; không làm mờ chữ hoặc thanh trạng thái.";

  const modeTitle = document.createElement("div");
  modeTitle.className = "yetiWidgetControlHead";
  const modeLabel = document.createElement("span");
  modeLabel.textContent = "Bố cục";
  const modeValue = document.createElement("span");
  modeValue.className = "yetiWidgetControlValue";
  modeValue.textContent = current.compact ? "GỌN" : "MẶC ĐỊNH";
  modeTitle.append(modeLabel, modeValue);

  const modeRow = document.createElement("div");
  modeRow.className = "yetiWidgetModeRow";
  const compactBtn = document.createElement("button");
  compactBtn.className = `chip interactive-region ${current.compact ? "on" : ""}`;
  compactBtn.textContent = "COMPACT HUD";
  compactBtn.addEventListener("click", () => {
    current = { ...current, compact: !current.compact };
    saveAppearance(current);
    applyAppearance(current);
    syncControlPanel(true);
  });
  const modeHint = document.createElement("div");
  modeHint.className = "hint";
  modeHint.textContent = "Compact HUD xếp tên, thanh và phần trăm trên cùng một hàng để ít che màn hình hơn.";
  modeRow.append(compactBtn, modeHint);

  const opacityControl = makeRange({
    label: "Độ trong suốt nền",
    hint: "Kéo sang trái để nền mờ hơn và ít che game.",
    min: 0.08,
    max: 0.85,
    step: 0.01,
    value: current.backgroundOpacity,
    format: (v) => `${Math.round(v * 100)}%`,
    onChange: (v) => {
      current = { ...current, backgroundOpacity: clamp(v, 0.08, 0.85) };
      saveAppearance(current);
      applyAppearance(current);
    },
  });

  const scaleControl = makeRange({
    label: "Kích thước widget",
    hint: "70% cho màn hình nhỏ, 100% mặc định, tối đa 150%.",
    min: 0.7,
    max: 1.5,
    step: 0.05,
    value: current.scale,
    format: (v) => `${Math.round(v * 100)}%`,
    onChange: (v) => {
      current = { ...current, scale: clamp(v, 0.7, 1.5) };
      saveAppearance(current);
      applyAppearance(current);
    },
  });

  const presets = document.createElement("div");
  presets.className = "yetiWidgetPresets";
  const presetValues = [
    ["Nhỏ", 0.85],
    ["Mặc định", 1],
    ["Lớn", 1.2],
  ] as const;
  for (const [label, scale] of presetValues) {
    const btn = document.createElement("button");
    btn.className = "chip interactive-region";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      current = { ...current, scale };
      saveAppearance(current);
      applyAppearance(current);
      syncControlPanel(true);
    });
    presets.appendChild(btn);
  }

  const reset = document.createElement("button");
  reset.className = "tbtn ghost yetiWidgetReset interactive-region";
  reset.textContent = "Khôi phục mặc định";
  reset.addEventListener("click", () => {
    current = { ...DEFAULTS };
    saveAppearance(current);
    applyAppearance(current);
    syncControlPanel(true);
  });

  box.append(title, intro, modeTitle, modeRow, opacityControl, scaleControl, presets, reset);
  return box;
}

let syncing = false;
function syncControlPanel(forceReplace = false) {
  if (syncing) return;
  syncing = true;
  try {
    const content = document.querySelector<HTMLElement>(".settingsContent");
    const active = Array.from(document.querySelectorAll<HTMLElement>(".settingsRailBtn.on"))[0];
    const isWidgets = active?.textContent?.trim() === "Tiện ích";
    const existing = content?.querySelector<HTMLElement>("[data-yeti-widget-controls]") ?? null;

    if (!content || !isWidgets) {
      existing?.remove();
      return;
    }

    if (forceReplace) existing?.remove();
    if (!content.querySelector("[data-yeti-widget-controls]")) {
      content.appendChild(buildControls());
    }
  } finally {
    syncing = false;
  }
}

function isDetachedElder(body: HTMLElement): boolean {
  return Array.from(body.querySelectorAll<HTMLElement>(".ok")).some((el) =>
    (el.textContent ?? "").includes("Prime Elder"),
  );
}

function isDashboardElder(wrap: HTMLElement): boolean {
  return (wrap.querySelector<HTMLElement>(".primeElder")?.textContent ?? "").includes("Prime Elder");
}

function cleanupRestoredPrimeLists() {
  const detachedBody = document.querySelector<HTMLElement>(".primeFrame .frameBody");
  if (detachedBody) {
    const restored = Array.from(
      detachedBody.querySelectorAll<HTMLElement>(".primeList[data-yeti-prime-quest-restore]"),
    );
    const native = detachedBody.querySelector(".primeList:not([data-yeti-prime-quest-restore])");
    if (!isDetachedElder(detachedBody) || native) restored.forEach((el) => el.remove());
    else restored.slice(1).forEach((el) => el.remove());
  }

  const dashWrap = document.querySelector<HTMLElement>(".primeWrap");
  if (dashWrap) {
    const restored = Array.from(
      dashWrap.querySelectorAll<HTMLElement>(".condList[data-yeti-prime-quest-restore]"),
    );
    const native = dashWrap.querySelector(".condList:not([data-yeti-prime-quest-restore])");
    if (!isDashboardElder(dashWrap) || native) restored.forEach((el) => el.remove());
    else restored.slice(1).forEach((el) => el.remove());
  }
}

function renderDetachedPrimeQuests(quests: PrimeQuestLite[]) {
  const body = document.querySelector<HTMLElement>(".primeFrame .frameBody");
  if (!body || !quests.length || !isDetachedElder(body)) return;
  if (body.querySelector(".primeList:not([data-yeti-prime-quest-restore])")) return;

  let list = body.querySelector<HTMLElement>(".primeList[data-yeti-prime-quest-restore]");
  if (!list) {
    list = document.createElement("ul");
    list.className = "primeList";
    list.dataset.yetiPrimeQuestRestore = "1";
    body.appendChild(list);
  }
  list.replaceChildren();

  for (const q of quests) {
    const li = document.createElement("li");
    li.className = q.done ? "q-done" : "q-open";
    const box = document.createElement("span");
    box.className = "qbox";
    box.textContent = q.done ? "▣" : "▢";
    li.append(box, document.createTextNode(` ${translatePrimeQuest(q.name)}`));
    list.appendChild(li);
  }
}

function renderDashboardPrimeQuests(quests: PrimeQuestLite[]) {
  const wrap = document.querySelector<HTMLElement>(".primeWrap");
  if (!wrap || !quests.length || !isDashboardElder(wrap)) return;
  if (wrap.querySelector(".condList:not([data-yeti-prime-quest-restore])")) return;

  let list = wrap.querySelector<HTMLElement>(".condList[data-yeti-prime-quest-restore]");
  if (!list) {
    list = document.createElement("ul");
    list.className = "condList";
    list.dataset.yetiPrimeQuestRestore = "1";
    wrap.appendChild(list);
  }
  list.replaceChildren();

  for (const q of quests) {
    const li = document.createElement("li");
    li.className = q.done ? "condDone" : "condOpen";

    const mark = document.createElement("span");
    mark.className = `mark ${q.done ? "ok" : "no"}`;
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = q.done ? "✓" : "×";

    const text = document.createElement("span");
    text.textContent = translatePrimeQuest(q.name);
    li.append(mark, text);
    list.appendChild(li);
  }
}

function needsPrimeQuestRestore(): boolean {
  const detachedBody = document.querySelector<HTMLElement>(".primeFrame .frameBody");
  const detachedNeeds = Boolean(
    detachedBody &&
      isDetachedElder(detachedBody) &&
      !detachedBody.querySelector(".primeList:not([data-yeti-prime-quest-restore])"),
  );

  const dashWrap = document.querySelector<HTMLElement>(".primeWrap");
  const dashNeeds = Boolean(
    dashWrap &&
      isDashboardElder(dashWrap) &&
      !dashWrap.querySelector(".condList:not([data-yeti-prime-quest-restore])"),
  );
  return detachedNeeds || dashNeeds;
}

let primeFetchInFlight = false;
let lastPrimeFetch = 0;

async function syncPrimeElderQuests() {
  cleanupRestoredPrimeLists();
  if (!needsPrimeQuestRestore()) return;
  if (primeFetchInFlight || Date.now() - lastPrimeFetch < 900) return;

  primeFetchInFlight = true;
  lastPrimeFetch = Date.now();
  try {
    const me = await window.isleOverlay.apiGet<{
      prime?: { elder?: boolean; quests?: PrimeQuestLite[] };
    }>("/api/overlay/me");
    if (me.error || me.prime?.elder !== true || !Array.isArray(me.prime.quests)) {
      cleanupRestoredPrimeLists();
      return;
    }

    const quests = me.prime.quests.filter(
      (q): q is PrimeQuestLite => Boolean(q && typeof q.name === "string" && typeof q.done === "boolean"),
    );
    renderDetachedPrimeQuests(quests);
    renderDashboardPrimeQuests(quests);
    syncPrimeTranslations();
  } catch {
    // Keep the overlay alive; a later DOM/API refresh retries safely.
  } finally {
    primeFetchInFlight = false;
  }
}

export function installWidgetAppearance() {
  applyAppearance(readAppearance());

  const observer = new MutationObserver(() => {
    syncControlPanel();
    cleanupRestoredPrimeLists();
    syncPrimeTranslations();
    void syncPrimeElderQuests();
  });
  const start = () => {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    syncControlPanel();
    cleanupRestoredPrimeLists();
    syncPrimeTranslations();
    void syncPrimeElderQuests();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
