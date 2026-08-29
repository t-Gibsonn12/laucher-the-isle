import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  LauncherStatus,
  MumbleStatus,
  OverlaySettings,
  PlayerMe,
} from "./preload";

type Page = "home" | "server" | "hud" | "voice" | "settings";
type IconName =
  | "home"
  | "server"
  | "hud"
  | "voice"
  | "settings"
  | "play"
  | "users"
  | "pulse"
  | "shield"
  | "download"
  | "steam"
  | "mic"
  | "headphones"
  | "map"
  | "heart"
  | "leaf"
  | "close"
  | "minimize"
  | "maximize"
  | "refresh"
  | "external";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    server: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h7M11 17h7" /></>,
    hud: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3" /></>,
    voice: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    play: <path d="m9 6 9 6-9 6Z" fill="currentColor" stroke="none" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    pulse: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    steam: <><circle cx="15" cy="8" r="3" /><path d="m3 15 5 2 2.6-2.4M8 17a3 3 0 1 0 3-3" /><path d="m11.5 13.5 2-2" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4" /></>,
    headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M18 19h-2v-7h4v5a2 2 0 0 1-2 2ZM6 19H4a2 2 0 0 1-2-2v-5h4Z" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    leaf: <><path d="M11 20A7 7 0 0 1 9 6c4-2 8-2 12-2 0 4 0 8-2 12a7 7 0 0 1-8 4Z" /><path d="M9 21c0-5 3-9 9-13" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    minimize: <path d="M5 12h14" />,
    maximize: <rect x="5" y="5" width="14" height="14" rx="1" />,
    refresh: <><path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 4v7h-7" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`launchSwitch ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label={label}
    >
      <span />
    </button>
  );
}

function StatusDot({ online }: { online: boolean }) {
  return <span className={`launchStatusDot ${online ? "online" : "offline"}`} />;
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="launchSectionTitle">
      <div className="launchEyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}

const nav: { id: Page; label: string; icon: IconName }[] = [
  { id: "home", label: "Trang chủ", icon: "home" },
  { id: "server", label: "Máy chủ", icon: "server" },
  { id: "hud", label: "HUD", icon: "hud" },
  { id: "voice", label: "Voice", icon: "voice" },
  { id: "settings", label: "Cài đặt", icon: "settings" },
];

const panelInfo: Record<string, { title: string; sub: string; icon: IconName }> = {
  stats: { title: "Chỉ số sinh tồn", sub: "Máu, đói, khát, thể lực và trưởng thành", icon: "pulse" },
  prime: { title: "Tiến độ Prime", sub: "Nhiệm vụ và điều kiện Prime Elder", icon: "leaf" },
  heart: { title: "Tim sinh tồn", sub: "Biểu tượng máu gọn bên góc màn hình", icon: "heart" },
  radar: { title: "Bản đồ trực tiếp", sub: "Vị trí, hướng nhìn và điểm đánh dấu", icon: "map" },
  voice: { title: "Trạng thái voice", sub: "Plugin, bridge và phím nhấn để nói", icon: "voice" },
};

function playerCount(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function LauncherApp() {
  const [page, setPage] = useState<Page>("home");
  const [settings, setSettings] = useState<OverlaySettings | null>(null);
  const [status, setStatus] = useState<LauncherStatus | null>(null);
  const [mumble, setMumble] = useState<MumbleStatus | null>(null);
  const [me, setMe] = useState<PlayerMe | null>(null);
  const [authed, setAuthed] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [online, setOnline] = useState<{ players: number | null; max: number; ping: number | null }>({
    players: null,
    max: 300,
    ping: null,
  });

  const refresh = useCallback(async () => {
    const nextStatus = await window.isleOverlay.launcherGetStatus();
    setStatus(nextStatus);
    setMumble(nextStatus.mumble);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("launcher-mode");
    void Promise.all([
      window.isleOverlay.getSettings().then(setSettings),
      window.isleOverlay.getAuth().then((auth) => setAuthed(auth.authed)),
      refresh(),
    ]);
    const offSettings = window.isleOverlay.onSettingsChanged(setSettings);
    const offAuth = window.isleOverlay.onAuthChanged(() => {
      void window.isleOverlay.getAuth().then((auth) => setAuthed(auth.authed));
    });
    const poll = window.setInterval(() => void refresh(), 3000);
    return () => {
      document.documentElement.classList.remove("launcher-mode");
      offSettings();
      offAuth();
      window.clearInterval(poll);
    };
  }, [refresh]);

  useEffect(() => {
    if (!authed) {
      setMe(null);
      return;
    }
    let alive = true;
    const load = async () => {
      const result = await window.isleOverlay.apiGet<PlayerMe>("/api/overlay/me");
      if (alive && !result.error) setMe(result);
    };
    void load();
    const poll = window.setInterval(load, 12000);
    return () => {
      alive = false;
      window.clearInterval(poll);
    };
  }, [authed]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const result = await window.isleOverlay.apiGet<Record<string, unknown>>(
        "/api/overlay/server/status",
      );
      if (!alive || result.error) return;
      const players = playerCount(
        result.players ?? result.onlinePlayers ?? result.currentPlayers ?? result.online,
      );
      const max = playerCount(result.maxPlayers ?? result.capacity ?? result.slots) ?? 300;
      const ping = playerCount(result.ping ?? result.latency);
      setOnline({ players, max, ping });
    };
    void load();
    const poll = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(poll);
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<OverlaySettings>) => {
    setSettings(await window.isleOverlay.setSettings(patch));
  }, []);

  const togglePanel = useCallback(
    (key: string, enabled: boolean) => {
      const panels = { ...(settings?.panels ?? {}), [key]: enabled };
      void updateSettings({ panels });
    },
    [settings?.panels, updateSettings],
  );

  const username = useMemo(() => {
    if (me?.name?.trim()) return me.name.trim();
    const tail = settings?.steamId?.slice(-6);
    return tail ? `Yeti_${tail}` : "Yeti_Player";
  }, [me?.name, settings?.steamId]);

  const play = useCallback(async () => {
    if (launching) return;
    setLaunching(true);
    setNotice(null);
    const result = await window.isleOverlay.launcherLaunch({ username });
    if (!result.launched) setNotice("Không thể mở Steam. Hãy kiểm tra Steam đang được cài đặt.");
    else if (result.voice?.needsInstall) {
      setNotice("Game đã mở. Cài Mumble để bật voice khoảng cách.");
      setPage("voice");
    } else if (result.voice?.needsPlugin) {
      setNotice("Game đã mở nhưng plugin Exile Voice chưa sẵn sàng.");
      setPage("voice");
    } else if (result.voice?.restartRequired) {
      setNotice("Plugin đã cài. Hãy khởi động lại Mumble một lần để kích hoạt voice.");
      setPage("voice");
    } else setNotice("Đang khởi động The Isle và kết nối proximity voice...");
    window.setTimeout(() => setLaunching(false), 1800);
  }, [launching, username]);

  const connectVoice = useCallback(async () => {
    const result = await window.isleOverlay.mumbleConnect(username);
    if (result.needsInstall) setNotice("Máy chưa có Mumble 1.5.915. Bấm Cài Mumble bên dưới.");
    else if (result.needsPluginBuild) setNotice("Bản chạy thử chưa kèm DLL Exile Voice đã build.");
    else if (result.needsPlugin) setNotice("Không thể cài plugin Exile Voice. Hãy đóng Mumble rồi thử lại.");
    else if (!result.ok) setNotice("Không thể kết nối máy chủ voice. Kiểm tra cổng 64738 và 8890.");
    else if (result.restartRequired) setNotice("Plugin đã cài. Đóng và mở lại Mumble để plugin được nạp.");
    else setNotice("Đã kết nối Mumble và cấu hình Exile Voice.");
    void refresh();
  }, [refresh, username]);

  const installVoicePlugin = useCallback(async () => {
    const result = await window.isleOverlay.mumbleInstallPlugin();
    if (result.needsPluginBuild) {
      setNotice("Bản chạy thử chưa có DLL; bản Windows CI sẽ tự đóng gói plugin.");
    } else if (result.closeMumble) {
      setNotice("Hãy đóng Mumble rồi bấm cài plugin lại.");
    } else if (!result.ok) {
      setNotice("Không thể cài plugin Exile Voice.");
    } else if (result.restartRequired) {
      setNotice("Đã cài plugin. Hãy khởi động lại Mumble một lần.");
    } else {
      setNotice("Đã cài và cấu hình plugin Exile Voice.");
    }
    void refresh();
  }, [refresh]);

  const installMumble = useCallback(async () => {
    setNotice("Đang tải Mumble 1.5.915 từ nguồn chính thức và kiểm tra SHA-256...");
    const result = await window.isleOverlay.mumbleDownload();
    if (!result.ok) {
      setNotice(
        result.error?.includes("SHA-256")
          ? "Đã chặn bộ cài Mumble vì mã SHA-256 không khớp."
          : "Không thể tải hoặc chạy bộ cài Mumble chính thức.",
      );
      return;
    }
    if (result.alreadyInstalled) setNotice("Mumble đã được cài trên máy.");
    else setNotice("Đã xác thực bộ cài Mumble; quá trình cài tự động đang chạy.");
    window.setTimeout(() => void refresh(), 3500);
    window.setTimeout(() => void refresh(), 9000);
  }, [refresh]);

  const recordPtt = useCallback(async () => {
    setNotice("Nhấn một phím bất kỳ để làm phím nói...");
    const key = await window.isleOverlay.recordVoiceKey();
    if (key) {
      await updateSettings({ voicePttKey: key });
      setNotice(`Đã đặt phím nói thành ${key}.`);
    } else setNotice("Không ghi nhận được phím.");
  }, [updateSettings]);

  const navLabel = nav.find((item) => item.id === page)?.label ?? "Trang chủ";

  return (
    <div className="launcherRoot interactive-region">
      <header className="launcherTitlebar">
        <div className="launcherDragRegion">
          <span className="launcherTitleMark">Y</span>
          <span>YETI VIETNAM</span>
          <i />
          <small>THE ISLE LAUNCHER</small>
        </div>
        <div className="launcherWindowActions">
          <button type="button" onClick={() => void window.isleOverlay.launcherMinimize()} aria-label="Thu nhỏ">
            <Icon name="minimize" size={16} />
          </button>
          <button type="button" onClick={() => void window.isleOverlay.launcherToggleMaximize()} aria-label="Phóng to">
            <Icon name="maximize" size={14} />
          </button>
          <button className="danger" type="button" onClick={() => void window.isleOverlay.launcherClose()} aria-label="Đóng">
            <Icon name="close" size={17} />
          </button>
        </div>
      </header>

      <aside className="launcherSidebar">
        <div className="launcherBrand">
          <div className="launcherBrandEmblem"><span>Y</span></div>
          <div><strong>YETI</strong><small>VIETNAM</small></div>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              type="button"
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => setPage(item.id)}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="launcherSideStatus">
          <div className="launcherSideStatusRow">
            <StatusDot online={status?.supported === true} />
            <span>HỆ THỐNG</span>
            <b>ỔN ĐỊNH</b>
          </div>
          <div className="launcherSideStatusRow">
            <StatusDot online={mumble?.plugin.bridgeConnected === true} />
            <span>VOICE</span>
            <b>{mumble?.plugin.bridgeConnected ? "PROXIMITY" : mumble?.running ? "ĐÃ MỞ" : "CHỜ"}</b>
          </div>
        </div>
        <div className="launcherCredit">Phát triển bởi<br /><b>DeAndrew Marquis</b></div>
      </aside>

      <main className="launcherMain">
        <div className="launcherTopbar">
          <div>
            <small>YETI VIETNAM /</small>
            <strong>{navLabel}</strong>
          </div>
          <div className="launcherTopActions">
            <button className="launcherIconButton" type="button" onClick={() => void refresh()} title="Làm mới">
              <Icon name="refresh" size={17} />
            </button>
            <button
              type="button"
              className={`launcherAccount ${authed ? "signed" : ""}`}
              onClick={() => {
                if (!authed) void window.isleOverlay.steamLogin();
              }}
            >
              <span className="launcherAvatar">{username.charAt(0).toUpperCase()}</span>
              <span><small>{authed ? "ĐÃ KẾT NỐI STEAM" : "CHƯA ĐĂNG NHẬP"}</small><b>{authed ? username : "Đăng nhập Steam"}</b></span>
            </button>
          </div>
        </div>

        <div className="launcherContent">
          {page === "home" ? (
            <div className="launcherHome">
              <section className="launcherHero">
                <div className="launcherHeroShade" />
                <div className="launcherHeroCopy">
                  <div className="launcherHeroTag"><StatusDot online /> SERVER EVRIMA ĐANG HOẠT ĐỘNG</div>
                  <h1><span>YETI</span> VIETNAM</h1>
                  <p>THE ISLE · SURVIVAL EVOLVED</p>
                  <div className="launcherHeroRule" />
                  <div className="launcherHeroMeta">
                    <span><Icon name="users" size={16} /><b>{online.players ?? "—"}</b> / {online.max} NGƯỜI CHƠI</span>
                    <span><Icon name="pulse" size={16} /><b>{online.ping ?? "—"}</b> MS</span>
                    <span><Icon name="shield" size={16} /> HUD + VOICE</span>
                  </div>
                  <button className="launcherPlay" type="button" onClick={() => void play()} disabled={launching}>
                    <span className="launcherPlayIcon"><Icon name="play" size={26} /></span>
                    <span><small>{launching ? "ĐANG KHỞI ĐỘNG" : "SẴN SÀNG SINH TỒN"}</small><b>{launching ? "VUI LÒNG CHỜ..." : "CHƠI NGAY"}</b></span>
                  </button>
                </div>
                <div className="launcherHeroVersion">EVRIMA <b>v{status?.appVersion ?? __APP_VERSION__}</b></div>
              </section>

              <section className="launcherQuickGrid">
                <button type="button" className="launcherQuickCard" onClick={() => setPage("server")}>
                  <div className="launcherQuickIcon"><Icon name="server" /></div>
                  <div><small>MÁY CHỦ #1</small><b>Yeti Vietnamese</b><span><StatusDot online /> Trực tuyến</span></div>
                  <Icon name="external" size={15} />
                </button>
                <button type="button" className="launcherQuickCard" onClick={() => setPage("hud")}>
                  <div className="launcherQuickIcon"><Icon name="hud" /></div>
                  <div><small>HUD TRONG GAME</small><b>{settings?.panels?.stats === false ? "Đang tinh giản" : "Đã bật"}</b><span>F8 mở Tổng quan</span></div>
                  <Icon name="external" size={15} />
                </button>
                <button type="button" className="launcherQuickCard" onClick={() => setPage("voice")}>
                  <div className="launcherQuickIcon"><Icon name="voice" /></div>
                  <div><small>VOICE KHOẢNG CÁCH</small><b>{settings?.voiceEnabled ? "Đã bật" : "Đang tắt"}</b><span>Exile Voice + Mumble</span></div>
                  <Icon name="external" size={15} />
                </button>
              </section>
            </div>
          ) : null}

          {page === "server" ? (
            <div className="launcherPage">
              <SectionTitle eyebrow="MÁY CHỦ SINH TỒN" title="Yeti Vietnamese #1" sub="Theo dõi trạng thái và vào The Isle trực tiếp từ launcher." />
              <section className="launcherServerBanner">
                <div className="launcherServerPrimary">
                  <div className="launcherServerGlyph"><Icon name="server" size={30} /></div>
                  <div><small>THE ISLE · EVRIMA</small><h2>Yeti Vietnamese #1</h2><p>Máy chủ cộng đồng Việt Nam · HUD đồng bộ · Voice khoảng cách</p></div>
                </div>
                <div className="launcherServerNumbers">
                  <div><small>NGƯỜI CHƠI</small><b>{online.players ?? "—"}<em>/{online.max}</em></b></div>
                  <div><small>ĐỘ TRỄ</small><b>{online.ping ?? "—"}<em>ms</em></b></div>
                  <div><small>TRẠNG THÁI</small><b className="green">ONLINE</b></div>
                </div>
              </section>
              <div className="launcherCardGrid two">
                <section className="launcherPanelCard">
                  <div className="launcherCardHead"><span><Icon name="shield" /> Tính năng máy chủ</span></div>
                  <div className="launcherFeatureList">
                    <div><Icon name="hud" /><span><b>HUD trực tiếp</b><small>Dữ liệu máu, thể lực, diet và Prime</small></span></div>
                    <div><Icon name="voice" /><span><b>Voice vị trí</b><small>Âm thanh 3D theo tọa độ khủng long</small></span></div>
                    <div><Icon name="map" /><span><b>Bản đồ live</b><small>Radar và hướng nhìn đồng bộ</small></span></div>
                  </div>
                </section>
                <section className="launcherPanelCard">
                  <div className="launcherCardHead"><span><Icon name="steam" /> Khởi động</span></div>
                  <div className="launcherReadiness">
                    <div><StatusDot online={status?.steamInstalled === true} /><span>Steam</span><b>{status?.steamInstalled ? "Sẵn sàng" : "Chưa tìm thấy"}</b></div>
                    <div><StatusDot online={mumble?.installed === true} /><span>Mumble Voice</span><b>{mumble?.installed ? "Sẵn sàng" : "Cần cài đặt"}</b></div>
                    <div><StatusDot online={mumble?.plugin.installed === true} /><span>Exile plugin</span><b>{mumble?.plugin.installed ? "Đã cài" : "Cần cài đặt"}</b></div>
                    <div><StatusDot online={authed} /><span>Tài khoản</span><b>{authed ? username : "Chưa đăng nhập"}</b></div>
                  </div>
                  <button className="launcherWideAction" type="button" onClick={() => void play()}><Icon name="play" /> Chơi ngay</button>
                </section>
              </div>
            </div>
          ) : null}

          {page === "hud" ? (
            <div className="launcherPage">
              <SectionTitle eyebrow="GIAO DIỆN TRONG GAME" title="HUD sinh tồn" sub="Bật đúng thông tin bạn cần; mọi thành phần còn lại đều click-through và tự ẩn ngoài game." />
              <div className="launcherHudLayout">
                <section className="launcherHudPreview">
                  <div className="launcherPreviewLabel">XEM TRƯỚC TRONG GAME</div>
                  <div className="launcherMockStats">
                    <div className="launcherMockTitle"><span>Tyrannosaurus</span><b>100%</b></div>
                    {[{ n: "Máu", v: 94, c: "#ff6464" }, { n: "Thể lực", v: 81, c: "#82f5ad" }, { n: "Đói", v: 72, c: "#d6e96b" }, { n: "Khát", v: 88, c: "#60d6bd" }].map((item) => (
                      <div className="launcherMockRow" key={item.n}><span>{item.n}</span><b>{item.v}%</b><i><em style={{ width: `${item.v}%`, background: item.c }} /></i></div>
                    ))}
                  </div>
                  <div className="launcherMockHeart"><Icon name="heart" size={38} /><span>94%</span></div>
                  <div className="launcherPreviewHint">F8 · MỞ TỔNG QUAN</div>
                </section>
                <section className="launcherHudOptions">
                  {Object.entries(panelInfo).map(([key, info]) => {
                    const enabled = settings?.panels?.[key] !== false;
                    return (
                      <div className="launcherOptionRow" key={key}>
                        <div className="launcherOptionIcon"><Icon name={info.icon} /></div>
                        <div><b>{info.title}</b><small>{info.sub}</small></div>
                        <Switch on={enabled} onChange={(next) => togglePanel(key, next)} label={info.title} />
                      </div>
                    );
                  })}
                  <div className="launcherSliderRow">
                    <span><b>Độ trong suốt HUD</b><small>{Math.round((settings?.opacity ?? 1) * 100)}%</small></span>
                    <input type="range" min="30" max="100" value={Math.round((settings?.opacity ?? 1) * 100)} onChange={(event) => void updateSettings({ opacity: Number(event.target.value) / 100 })} />
                  </div>
                </section>
              </div>
            </div>
          ) : null}

          {page === "voice" ? (
            <div className="launcherPage">
              <SectionTitle eyebrow="EXILE VOICE · MUMBLE" title="Proximity voice" sub="Bridge phía server đọc RCON và gửi gain/pan riêng cho từng người; không sửa hay inject vào game." />
              <div className="launcherVoiceHero">
                <div className={`launcherVoiceOrb ${mumble?.plugin.bridgeConnected ? "linked" : mumble?.running ? "running" : ""}`}>
                  <Icon name="mic" size={42} /><i /><i />
                </div>
                <div className="launcherVoiceSummary">
                  <small>TRẠNG THÁI VOICE</small>
                  <h2>{mumble?.plugin.bridgeConnected ? "Proximity đang hoạt động" : mumble?.plugin.bridgeReachable ? "Bridge đang chờ plugin" : mumble?.running ? "Mumble đang chạy" : mumble?.installed ? "Sẵn sàng kết nối" : "Cần cài Mumble"}</h2>
                  <p>{mumble?.plugin.bridgeConnected ? "Plugin đang nhận hệ số khoảng cách và stereo pan từ server." : "Launcher tự cài runtime; lần đầu hãy bật Exile Voice trong Mumble > Settings > Plugins rồi hoàn tất !verify."}</p>
                </div>
                <div className="launcherVoiceState"><StatusDot online={mumble?.plugin.bridgeConnected === true} /><span>{mumble?.plugin.bridgeConnected ? "PROXIMITY" : "STANDBY"}</span></div>
              </div>
              <div className="launcherCardGrid two">
                <section className="launcherPanelCard">
                  <div className="launcherCardHead"><span><Icon name="settings" /> Điều khiển voice</span><Switch on={settings?.voiceEnabled === true} onChange={(next) => void updateSettings({ voiceEnabled: next })} label="Bật voice" /></div>
                  <div className="launcherSegment">
                    <button type="button" className="active" onClick={() => void updateSettings({ voiceMode: "push-to-talk" })}>GLOBAL PUSH-TO-TALK · SOCKETRPC</button>
                  </div>
                  <button type="button" className="launcherKeybind" onClick={() => void recordPtt()}>
                    <span><Icon name="mic" /><span><b>Phím nói toàn cục</b><small>Launcher điều khiển Mumble SocketRPC</small></span></span>
                    <kbd>{settings?.voicePttKey ?? "V"}</kbd>
                  </button>
                  <div className="launcherVoiceServer"><span><Icon name="server" /><span><b>{status?.voice.host ?? "104.234.180.152"}</b><small>Mumble :{status?.voice.port ?? 64738} · Bridge :{status?.voice.bridgePort ?? 8890}</small></span></span><code>{status?.voice.engine ?? "Exile"}</code></div>
                  <button className="launcherWideAction" type="button" onClick={() => void connectVoice()}><Icon name="headphones" /> Kết nối voice</button>
                </section>
                <section className="launcherPanelCard">
                  <div className="launcherCardHead"><span><Icon name="download" /> Voice runtime</span><b className="launcherVersionTag">v{mumble?.plugin.version ?? "0.1.0"}</b></div>
                  <div className="launcherMumbleInfo">
                    <div className="launcherMumbleLogo">M</div>
                    <p><b>Mumble + Exile Voice mã nguồn mở</b><span>BSD-3-Clause + MIT · Windows x64</span></p>
                  </div>
                  <div className="launcherReadiness compact">
                    <div><StatusDot online={mumble?.installed === true} /><span>Mumble {mumble?.version ?? "1.5.915"}</span><b>{mumble?.installed ? "Đã có" : "Chưa có"}</b></div>
                    <div><StatusDot online={mumble?.plugin.loaded === true} /><span>Exile plugin</span><b>{mumble?.plugin.loaded ? "Đã bật" : mumble?.plugin.configured ? "Mở Plugins để bật" : mumble?.plugin.installed ? "Cần cấu hình" : "Chưa có"}</b></div>
                    <div><StatusDot online={mumble?.plugin.bridgeReachable === true} /><span>Bridge RCON</span><b>{mumble?.plugin.bridgeConnected ? "Đã nối" : mumble?.plugin.bridgeReachable ? "Trực tuyến" : "Ngoại tuyến"}</b></div>
                  </div>
                  {!mumble?.installed ? <button className="launcherOutlineAction" type="button" onClick={() => void installMumble()}><Icon name="download" /> Tự cài Mumble 1.5.915</button> : null}
                  {!mumble?.plugin.installed ? <button className="launcherOutlineAction" type="button" onClick={() => void installVoicePlugin()}><Icon name="download" /> Cài Exile Voice plugin</button> : null}
                  {mumble?.plugin.configured && !mumble?.plugin.loaded ? <p className="launcherPluginHint">Bước một lần: mở Mumble → Settings → Plugins → bật <b>Exile Voice - Spatial Audio</b>, sau đó khởi động lại Mumble.</p> : null}
                </section>
              </div>
            </div>
          ) : null}

          {page === "settings" ? (
            <div className="launcherPage narrow">
              <SectionTitle eyebrow="TÙY CHỈNH LAUNCHER" title="Cài đặt" sub="Thiết lập cách launcher, HUD và Steam hoạt động trên máy của bạn." />
              <section className="launcherSettingsCard">
                <div className="launcherSettingRow"><span><b>Thu nhỏ sau khi bấm Chơi ngay</b><small>Giữ launcher chạy nền cùng HUD và proximity voice.</small></span><Switch on={settings?.minimizeLauncherOnPlay !== false} onChange={(next) => void updateSettings({ minimizeLauncherOnPlay: next })} label="Thu nhỏ launcher" /></div>
                <div className="launcherSettingRow"><span><b>Voice khoảng cách</b><small>Tự kết nối Mumble trước khi mở The Isle.</small></span><Switch on={settings?.voiceEnabled === true} onChange={(next) => void updateSettings({ voiceEnabled: next })} label="Voice khoảng cách" /></div>
                <div className="launcherSettingRow"><span><b>Chế độ Streamer</b><small>Giữ cửa sổ HUD để OBS có thể bắt hình.</small></span><Switch on={settings?.streamerMode === true} onChange={(next) => void updateSettings({ streamerMode: next })} label="Streamer mode" /></div>
                <div className="launcherSettingRow"><span><b>Chế độ tương thích</b><small>Dùng khi HUD bị đen hoặc không hiển thị trên Windows.</small></span><Switch on={settings?.compatMode === true} onChange={(next) => void updateSettings({ compatMode: next })} label="Chế độ tương thích" /></div>
              </section>
              <section className="launcherAboutCard">
                <div className="launcherBrandEmblem small"><span>Y</span></div>
                <div><b>Yeti VietNam Launcher</b><small>Phiên bản {status?.appVersion ?? __APP_VERSION__} · The Isle AppID 376210</small></div>
                <button type="button" onClick={() => void window.isleOverlay.launcherOpenExternal("https://github.com/AlinV2V/the-isle-exile-voice")}><Icon name="external" /> Mã nguồn Exile Voice</button>
              </section>
            </div>
          ) : null}
        </div>

        {notice ? <button type="button" className="launcherNotice" onClick={() => setNotice(null)}><StatusDot online={!notice.includes("Không") && !notice.includes("Chưa")} />{notice}<Icon name="close" size={14} /></button> : null}
      </main>
    </div>
  );
}
