function removeSkinEntryPoints() {
  const root = document.querySelector<HTMLElement>(".mainWin");
  if (!root) return;

  for (const el of root.querySelectorAll<HTMLElement>(".tab, .addon")) {
    if (el.textContent?.includes("Chỉnh skin")) el.remove();
  }
}

export function installRemovedSkinTab() {
  if (window.location.hash.replace(/^#/, "").startsWith("radar")) return;

  const observer = new MutationObserver(removeSkinEntryPoints);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(removeSkinEntryPoints, 0);
}
