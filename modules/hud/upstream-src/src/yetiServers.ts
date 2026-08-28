export type YetiServerConfig = {
  id: string;
  name: string;
  apiBaseUrl: string;
  enabled: boolean;
  order: number;
};

/**
 * Danh sách máy chủ Yeti được overlay cho phép kết nối.
 *
 * Hiện tại chỉ có Server #1. Khi Server #2 / #3 sẵn sàng, chỉ cần thêm
 * cấu hình mới vào mảng này. Overlay sẽ chấp nhận các API nằm trong danh
 * sách và từ chối mọi địa chỉ bên ngoài hệ thống Yeti.
 */
export const YETI_SERVERS: readonly YetiServerConfig[] = [
  {
    id: "yeti-1",
    name: "Yeti Vietnamese #1",
    apiBaseUrl: "https://yeti2.islepilot.eu",
    enabled: true,
    order: 1,
  },
] as const;

export const DEFAULT_YETI_SERVER_ID = "yeti-1";

export function normalizeServerUrl(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function getEnabledYetiServers(): YetiServerConfig[] {
  return YETI_SERVERS.filter((server) => server.enabled).sort((a, b) => a.order - b.order);
}

export function getDefaultYetiServer(): YetiServerConfig {
  const enabled = getEnabledYetiServers();
  const preferred = enabled.find((server) => server.id === DEFAULT_YETI_SERVER_ID);
  const server = preferred ?? enabled[0];
  if (!server) throw new Error("Yeti server registry is empty");
  return server;
}

export function findYetiServerById(id: unknown): YetiServerConfig | null {
  const wanted = String(id ?? "").trim();
  return getEnabledYetiServers().find((server) => server.id === wanted) ?? null;
}

export function findYetiServerByUrl(url: unknown): YetiServerConfig | null {
  const wanted = normalizeServerUrl(url);
  if (!wanted) return null;
  return (
    getEnabledYetiServers().find(
      (server) => normalizeServerUrl(server.apiBaseUrl) === wanted,
    ) ?? null
  );
}

export function isAllowedYetiServerUrl(url: unknown): boolean {
  return findYetiServerByUrl(url) != null;
}
