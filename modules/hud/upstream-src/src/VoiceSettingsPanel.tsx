import { useEffect, useMemo, useState } from "react";
import type { VoiceSettings, VoiceState } from "./preload";
import "./voiceSettings.css";

const EMPTY: VoiceSettings = {
  enabled: true,
  autoStart: true,
  bridgeHost: "",
  bridgePort: 8890,
  apiKey: "",
  mumbleHost: "",
  mumblePort: 64738,
  mumbleUsername: "",
  mumblePassword: "",
  mumbleChannel: "The Isle - Lobby",
  pttEnabled: true,
  pttKey: "V",
  debugLog: false,
  smoothing: 0.8,
  panSmoothing: 0.95,
  reconnectSec: 8,
};

function phaseLabel(state: VoiceState | null) {
  switch (state?.phase) {
    case "running": return "ĐANG KẾT NỐI";
    case "ready": return "SẴN SÀNG";
    case "runtime_missing": return "THIẾU MUMBLE RUNTIME";
    case "plugin_missing": return "THIẾU PROXIMITY PLUGIN";
    case "not_configured": return "CHƯA CẤU HÌNH";
    case "disabled": return "ĐÃ TẮT";
    case "error": return "LỖI";
    default: return "ĐANG KIỂM TRA";
  }
}

export function VoiceSettingsPanel() {
  const [settings, setSettings] = useState<VoiceSettings>(EMPTY);
  const [state, setState] = useState<VoiceState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isHealthy = state?.phase === "ready" || state?.phase === "running";
  const dirtyHint = useMemo(
    () => !settings.bridgeHost || !settings.apiKey || !settings.mumbleHost || state?.steamIdentityReady === false,
    [settings.bridgeHost, settings.apiKey, settings.mumbleHost, state?.steamIdentityReady],
  );

  useEffect(() => {
    let alive = true;
    Promise.all([window.isleOverlay.voiceGetSettings(), window.isleOverlay.voiceGetState()])
      .then(([nextSettings, nextState]) => {
        if (!alive) return;
        setSettings(nextSettings);
        setState(nextState);
      })
      .catch((err) => {
        if (alive) setNotice(err instanceof Error ? err.message : "Không đọc được trạng thái voice.");
      });

    const off = window.isleOverlay.onVoiceState((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  function patch<K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function run(label: string, action: () => Promise<VoiceState>) {
    if (busy) return;
    setBusy(label);
    setNotice(null);
    try {
      const next = await action();
      setState(next);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Thao tác voice thất bại.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (busy) return;
    setBusy("save");
    setNotice(null);
    try {
      const next = await window.isleOverlay.voiceSetSettings(settings);
      setSettings(next);
      setState(await window.isleOverlay.voiceGetState());
      setNotice("Đã lưu cấu hình voice.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không lưu được cấu hình voice.");
    } finally {
      setBusy(null);
    }
  }

  async function recordPtt() {
    if (busy) return;
    setBusy("ptt");
    setNotice("Nhấn một phím bất kỳ để đặt Push-to-Talk…");
    try {
      const key = await window.isleOverlay.voiceRecordPttKey();
      if (key) {
        patch("pttKey", key);
        setNotice(`Đã đặt Push-to-Talk: ${key}`);
      } else {
        setNotice("Không nhận được phím Push-to-Talk.");
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không ghi nhận được phím Push-to-Talk.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="voiceCard">
      <div className="voiceHeader">
        <div>
          <div className="voiceEyebrow">PROXIMITY / 3D VOICE</div>
          <strong>Yeti Voice</strong>
          <span>Mumble chạy ẩn; launcher tự quản lý plugin, kết nối và Push-to-Talk.</span>
        </div>
        <div className={`voiceBadge ${isHealthy ? "on" : ""}`}>{phaseLabel(state)}</div>
      </div>

      <div className="voiceToggleRow">
        <label className="voiceCheck">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => patch("enabled", e.target.checked)}
          />
          <span>Bật voice</span>
        </label>
        <label className="voiceCheck">
          <input
            type="checkbox"
            checked={settings.autoStart}
            onChange={(e) => patch("autoStart", e.target.checked)}
          />
          <span>Tự chạy cùng overlay</span>
        </label>
        <label className="voiceCheck">
          <input
            type="checkbox"
            checked={settings.pttEnabled}
            onChange={(e) => patch("pttEnabled", e.target.checked)}
          />
          <span>Push-to-Talk</span>
        </label>
        <label className="voiceCheck">
          <input
            type="checkbox"
            checked={settings.debugLog}
            onChange={(e) => patch("debugLog", e.target.checked)}
          />
          <span>Debug log</span>
        </label>
      </div>

      <div className="voiceGrid">
        <label>
          <span>Bridge host / IP</span>
          <input
            value={settings.bridgeHost}
            placeholder="voice.yeti.vn hoặc IP VPS"
            onChange={(e) => patch("bridgeHost", e.target.value)}
          />
        </label>
        <label>
          <span>Bridge port</span>
          <input
            type="number"
            min={1}
            max={65535}
            value={settings.bridgePort}
            onChange={(e) => patch("bridgePort", Number(e.target.value) || 8890)}
          />
        </label>
        <label className="wide">
          <span>Bridge API key</span>
          <input
            type="password"
            value={settings.apiKey}
            placeholder="Khóa dùng chung với Yeti Voice Bridge"
            onChange={(e) => patch("apiKey", e.target.value)}
          />
        </label>

        <label>
          <span>Mumble host / IP</span>
          <input
            value={settings.mumbleHost}
            placeholder="voice.yeti.vn hoặc IP VPS"
            onChange={(e) => patch("mumbleHost", e.target.value)}
          />
        </label>
        <label>
          <span>Mumble port</span>
          <input
            type="number"
            min={1}
            max={65535}
            value={settings.mumblePort}
            onChange={(e) => patch("mumblePort", Number(e.target.value) || 64738)}
          />
        </label>
        <label>
          <span>Tên voice</span>
          <input
            value={settings.mumbleUsername}
            placeholder="Để trống để dùng tên Yeti theo SteamID"
            onChange={(e) => patch("mumbleUsername", e.target.value)}
          />
        </label>
        <label>
          <span>Mật khẩu Mumble</span>
          <input
            type="password"
            value={settings.mumblePassword}
            placeholder="Không bắt buộc"
            onChange={(e) => patch("mumblePassword", e.target.value)}
          />
        </label>
        <label>
          <span>Phím Push-to-Talk</span>
          <input
            value={settings.pttKey}
            disabled
            aria-label="Phím Push-to-Talk"
          />
        </label>
        <label>
          <span>Đổi phím</span>
          <button
            type="button"
            className="tbtn ghost"
            disabled={Boolean(busy)}
            onClick={() => void recordPtt()}
          >
            {busy === "ptt" ? "ĐANG CHỜ PHÍM…" : `Ghi phím · ${settings.pttKey}`}
          </button>
        </label>
        <label className="wide">
          <span>Voice channel</span>
          <input
            value={settings.mumbleChannel}
            onChange={(e) => patch("mumbleChannel", e.target.value)}
          />
        </label>
      </div>

      <div className="voiceRuntimeStatus">
        <span className={state?.runtimeFound ? "ok" : "bad"}>
          Mumble runtime · {state?.runtimeFound ? "đã đóng gói" : "chưa đóng gói"}
        </span>
        <span className={state?.installedPluginFound ? "ok" : "bad"}>
          Proximity plugin · {state?.installedPluginFound ? "đã cài" : "chưa cài"}
        </span>
        <span className={state?.steamIdentityReady === false ? "bad" : "ok"}>
          Steam identity · {state?.steamIdentityReady === false ? "chưa đăng nhập" : "sẵn sàng"}
        </span>
        {state?.pid ? <span className="ok">PID · {state.pid}</span> : null}
      </div>

      {dirtyHint ? (
        <div className="voiceHint">
          Cần đăng nhập Steam và điền Bridge host, API key, Mumble host trước khi kết nối voice.
        </div>
      ) : null}
      {state?.lastError ? <div className="voiceError">{state.lastError}</div> : null}
      {notice ? <div className="voiceNotice">{notice}</div> : null}

      <div className="voiceActions">
        <button className="tbtn ghost" disabled={Boolean(busy)} onClick={() => void save()}>
          {busy === "save" ? "ĐANG LƯU…" : "Lưu voice"}
        </button>
        <button
          className="tbtn ghost"
          disabled={Boolean(busy)}
          onClick={() => void run("install", () => window.isleOverlay.voiceInstallPlugin())}
        >
          {busy === "install" ? "ĐANG CÀI…" : "Cài / cập nhật plugin"}
        </button>
        {state?.running ? (
          <button
            className="tbtn ghost"
            disabled={Boolean(busy)}
            onClick={() => void run("stop", () => window.isleOverlay.voiceStop())}
          >
            Dừng voice
          </button>
        ) : (
          <button
            className="tbtn steamLoginBtn"
            disabled={Boolean(busy) || dirtyHint}
            onClick={() => void run("start", async () => {
              await window.isleOverlay.voiceSetSettings(settings);
              return window.isleOverlay.voiceStart();
            })}
          >
            {busy === "start" ? "ĐANG KẾT NỐI…" : "Kết nối voice"}
          </button>
        )}
        <button
          className="tbtn ghost"
          onClick={() => void window.isleOverlay.voiceOpenPluginFolder()}
        >
          Mở thư mục plugin
        </button>
      </div>
    </div>
  );
}
