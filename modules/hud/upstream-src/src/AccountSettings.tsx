import { useEffect, useMemo, useState } from "react";
import type { OverlaySettings } from "./preload";
import { getYetiServerCatalog, selectYetiServer } from "./serverLock";
import { findYetiServerByUrl } from "./yetiServers";
import "./accountSettings.css";

type AccountSettingsProps = {
  settings: OverlaySettings | null;
  authed: boolean;
  steamId: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onQuit: () => void;
};

export function AccountSettings({
  settings,
  authed,
  steamId,
  onLogin,
  onLogout,
  onQuit,
}: AccountSettingsProps) {
  const servers = useMemo(() => getYetiServerCatalog(), []);
  const detected = findYetiServerByUrl(settings?.apiBaseUrl);
  const [activeServerId, setActiveServerId] = useState(detected?.id ?? servers[0]?.id ?? "");
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const current = findYetiServerByUrl(settings?.apiBaseUrl);
    if (current) setActiveServerId(current.id);
  }, [settings?.apiBaseUrl]);

  async function switchServer(serverId: string) {
    if (serverId === activeServerId || switchingId) return;
    setSwitchingId(serverId);
    setServerError(null);
    try {
      const selected = await selectYetiServer(serverId);
      setActiveServerId(selected.id);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Không thể đổi máy chủ.");
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <>
      <div className="secLabel">tài khoản Steam</div>
      <div className="accountCard">
        <div className="accountCardTop">
          <div className={`accountStateDot ${authed ? "on" : ""}`} />
          <div className="accountIdentity">
            <strong>{authed ? "Đã kết nối Steam" : "Chưa đăng nhập Steam"}</strong>
            <span>
              {authed
                ? steamId
                  ? `SteamID · ${steamId}`
                  : "Tài khoản đã được xác thực"
                : "Đăng nhập để đồng bộ dữ liệu với máy chủ Yeti."}
            </span>
          </div>
          <span className={`accountStatus ${authed ? "on" : ""}`}>
            {authed ? "ĐÃ KẾT NỐI" : "CHƯA KẾT NỐI"}
          </span>
        </div>

        <div className="accountActions">
          {authed ? (
            <button className="tbtn ghost" onClick={onLogout}>Đăng xuất Steam</button>
          ) : (
            <button className="tbtn steamLoginBtn" onClick={onLogin}>Đăng nhập bằng Steam</button>
          )}
        </div>
      </div>

      <div className="secLabel">máy chủ Yeti</div>
      <div className="accountServerList">
        {servers.map((server) => {
          const active = server.id === activeServerId;
          const switching = switchingId === server.id;
          return (
            <div key={server.id} className={`accountServerRow ${active ? "active" : ""}`}>
              <div className="accountServerIcon">Y</div>
              <div className="accountServerMeta">
                <strong>{server.name}</strong>
                <span>{server.apiBaseUrl}</span>
              </div>
              {active ? (
                <span className="serverCurrentBadge">ĐANG SỬ DỤNG</span>
              ) : (
                <button
                  className="tbtn ghost serverSwitchBtn"
                  disabled={Boolean(switchingId)}
                  onClick={() => void switchServer(server.id)}
                >
                  {switching ? "ĐANG CHUYỂN…" : "Chuyển sang"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {servers.length === 1 ? (
        <div className="hint accountServerHint">
          Hiện tại chỉ có Yeti Vietnamese #1. Khi Server #2 hoặc #3 được thêm vào hệ thống,
          chúng sẽ tự xuất hiện tại đây để bạn chuyển máy chủ.
        </div>
      ) : null}
      {serverError ? <div className="accountError">{serverError}</div> : null}

      <div className="secLabel">ứng dụng</div>
      <div className="menuFoot accountQuitRow">
        <button className="tbtn ghost" onClick={onQuit}>Thoát overlay</button>
      </div>
    </>
  );
}
