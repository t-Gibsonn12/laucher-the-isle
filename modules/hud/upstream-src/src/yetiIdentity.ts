const BRAND_NAME = "Yeti VietNam";
const BRAND_TITLE = `${BRAND_NAME} Overlay`;
const DEVELOPER_NAME = "DeAndrew Marquis";

type BrandRoot = Document | HTMLElement;

const REPLACEMENTS: Array<[string, string]> = [
  ["TheBurntIsle Overlay", BRAND_TITLE],
  ["TheBurntIsle", BRAND_NAME],
  ["THEBURNTISLE", "YETI VIETNAM"],
  ["YetiVN", BRAND_NAME],
  ["YannikAufDie1", DEVELOPER_NAME],
  ["Yannik Auf Die 1", DEVELOPER_NAME],
];

function brandText(input: string): string {
  let next = input;
  for (const [from, to] of REPLACEMENTS) next = next.split(from).join(to);
  return next;
}

function patchTextNodes(root: BrandRoot) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const current = node.nodeValue;
    if (current) {
      const next = brandText(current);
      if (next !== current) node.nodeValue = next;
    }
    node = walker.nextNode();
  }
}

function patchServerRows(root: BrandRoot) {
  const rows: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.classList.contains("idRow")) rows.push(root);
  root.querySelectorAll<HTMLElement>(".idRow").forEach((row) => rows.push(row));

  for (const row of rows) {
    const key = row.querySelector<HTMLElement>(".idKey");
    const value = row.querySelector<HTMLElement>(".idVal");
    if (!key || !value) continue;
    if ((key.textContent ?? "").trim().toLocaleLowerCase("vi") !== "máy chủ") continue;
    if (value.textContent !== BRAND_NAME) value.textContent = BRAND_NAME;
  }
}

function patchBranding(root: BrandRoot = document) {
  patchTextNodes(root);
  patchServerRows(root);
  if (document.title !== BRAND_TITLE) document.title = BRAND_TITLE;
}

export function installYetiIdentity() {
  patchBranding();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") {
        const current = record.target.nodeValue;
        if (current) {
          const next = brandText(current);
          if (next !== current) record.target.nodeValue = next;
        }
        continue;
      }

      for (const node of Array.from(record.addedNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          const current = node.nodeValue;
          if (current) {
            const next = brandText(current);
            if (next !== current) node.nodeValue = next;
          }
        } else if (node instanceof HTMLElement) {
          patchBranding(node);
        }
      }
    }
    patchServerRows(document);
  });

  const start = () => {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    patchBranding(document);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
