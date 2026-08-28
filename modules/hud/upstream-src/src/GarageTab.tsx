import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DinoModelViewer } from "./skin3d/dino-model-viewer";
import type { SkinPalette } from "./skin3d/types";
import type { CommandResult, GarageData, GarageDino } from "./preload";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type StatusResp = { status?: string; error?: string | null };

type ParkResult = {
  ok?: boolean;
  error?: string;
  commandId?: string;
  pending?: boolean;
  delaySec?: number;
};

async function pollCommand(commandId: string): Promise<{ ok: boolean; error?: string }> {
  for (let i = 0; i < 40; i++) {
    await sleep(1500);
    const r = (await window.isleOverlay.apiGet(
      `/api/overlay/garage/status?id=${commandId}`,
    )) as unknown as StatusResp;
    if (r.error && r.status !== "done" && r.status !== "failed") continue;
    if (r.status === "done") return { ok: true };
    if (r.status === "failed") return { ok: false, error: r.error ?? "Lệnh thất bại." };
  }
  return { ok: false, error: "Hết thời gian chờ máy chủ phản hồi." };
}

function pct(v: number): string {
  return `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
}

function genderLabel(gender: string): string {
  if (gender.toLowerCase() === "male") return "Đực";
  if (gender.toLowerCase() === "female") return "Cái";
  return gender;
}

function completedLabel(action: string): string {
  if (action === "Swap") return "Đã đổi khủng long.";
  if (action === "Restore") return "Đã khôi phục khủng long.";
  if (action === "Slay") return "Đã tiêu diệt khủng long hiện tại.";
  return "Đã hoàn tất.";
}

function currencyLabel(name?: string): string {
  return !name || name.toLowerCase() === "coins" ? "xu" : name;
}

export function GarageTab({
  authed,
  onLogin,
}: {
  authed: boolean;
  onLogin: () => void;
}) {
  const [data, setData] = useState<GarageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [picking, setPicking] = useState(false);
  const [picks, setPicks] = useState<[string, string, string]>(["", "", ""]);
  const [castLeft, setCastLeft] = useState(0);
  const cancelCast = useRef(false);
  const selRef = useRef<string | null>(null);
  selRef.current = selectedId;

  const refresh = useCallback(async () => {
    const r = await window.isleOverlay.apiGet<GarageData>("/api/overlay/garage");
    if (r.error) {
      setError(r.status === 404 ? "Hãy vào máy chủ trước để xem kho khủng long." : r.error);
      setData(null);
    } else {
      setError(null);
      setData(r as GarageData);
      const dinos = (r as GarageData).dinos;
      if (!selRef.current || !dinos.some((d) => d.id === selRef.current)) {
        setSelectedId(dinos[0]?.id ?? null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authed) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [authed, refresh]);

  const dinos = data?.dinos ?? [];
  const settings = data?.settings;
  const selected = useMemo(() => dinos.find((d) => d.id === selectedId) ?? null, [dinos, selectedId]);

  const flash = useCallback((text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  const runCommand = useCallback(
    async (label: string, path: string, body?: unknown) => {
      setBusy(label);
      try {
        const r = await window.isleOverlay.apiPost<CommandResult>(path, body);
        if (r.error || !r.ok) {
          flash(r.error ?? "Không thể thực hiện thao tác.", false);
          return;
        }
        if (r.commandId) {
          const done = await pollCommand(r.commandId);
          if (!done.ok) {
            flash(done.error ?? "Máy chủ đã từ chối thao tác.", false);
            return;
          }
        }
        flash(completedLabel(label), true);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh],
  );

  const park = useCallback(async () => {
    setBusy("Park");
    try {
      const start = await window.isleOverlay.apiPost<ParkResult>("/api/overlay/garage/park", {
        step: "start",
      });
      if (start.error || !start.ok) {
        flash(start.error ?? "Không thể thực hiện thao tác.", false);
        return;
      }

      if (start.pending && start.delaySec && start.delaySec > 0) {
        cancelCast.current = false;
        for (let n = start.delaySec; n > 0; n--) {
          if (cancelCast.current) {
            setCastLeft(0);
            void window.isleOverlay.apiPost("/api/overlay/garage/park", { step: "cancel" });
            flash("Đã hủy cất khủng long.", false);
            return;
          }
          setCastLeft(n);
          await sleep(1000);
        }
        setCastLeft(0);
        const fin = await window.isleOverlay.apiPost<ParkResult>("/api/overlay/garage/park", {
          step: "finalize",
        });
        if (fin.error || !fin.ok || !fin.commandId) {
          flash(fin.error ?? "Việc cất khủng long đã bị hủy.", false);
          return;
        }
        const done = await pollCommand(fin.commandId);
        if (!done.ok) {
          flash(done.error ?? "Máy chủ đã từ chối thao tác.", false);
          return;
        }
        flash("Đã cất khủng long.", true);
        await refresh();
        return;
      }

      if (start.commandId) {
        const done = await pollCommand(start.commandId);
        if (!done.ok) {
          flash(done.error ?? "Máy chủ đã từ chối thao tác.", false);
          return;
        }
      }
      flash("Đã cất khủng long.", true);
      await refresh();
    } finally {
      setBusy(null);
      setCastLeft(0);
    }
  }, [flash, refresh]);
  const slay = useCallback(() => runCommand("Slay", "/api/overlay/garage/slay"), [runCommand]);
  const restore = useCallback(
    (d: GarageDino, mutations?: string[]) =>
      runCommand(
        settings?.liveSwap ? "Swap" : "Restore",
        `/api/overlay/garage/${d.id}/restore`,
        mutations ? { mutations } : undefined,
      ),
    [runCommand, settings?.liveSwap],
  );

  const sell = useCallback(
    async (d: GarageDino) => {
      setBusy("Sell");
      try {
        const r = await window.isleOverlay.apiPost<CommandResult>(`/api/overlay/garage/${d.id}/sell`);
        if (r.error || !r.ok) {
          flash(r.error ?? "Không thể bán khủng long.", false);
          return;
        }
        flash(`Đã bán với giá ${(r.amount ?? 0).toLocaleString("vi-VN")} ${currencyLabel(settings?.currencyName)}.`, true);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh, settings?.currencyName],
  );

  const rename = useCallback(
    async (d: GarageDino, name: string) => {
      setBusy("Rename");
      try {
        const r = await window.isleOverlay.apiPost<CommandResult>(`/api/overlay/garage/${d.id}/rename`, {
          name,
        });
        if (r.error || !r.ok) {
          flash(r.error ?? "Không thể đổi tên.", false);
          return;
        }
        setRenaming(false);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh],
  );

  if (!authed) {
    return (
      <div className="noData">
        <div className="noDataTtl">Hãy đăng nhập trước</div>
        <div className="noDataSub">Đăng nhập bằng Steam để mở kho khủng long.</div>
        <button className="steamBtn interactive-region" onClick={onLogin}>
          Đăng nhập bằng Steam
        </button>
      </div>
    );
  }
  if (loading) {
    return <div className="noData"><div className="noDataTtl">Đang tải kho khủng long…</div></div>;
  }
  if (error) {
    return (
      <div className="noData">
        <div className="noDataTtl">Kho khủng long</div>
        <div className="noDataSub">{error}</div>
      </div>
    );
  }

  const busyAny = busy != null;

  return (
    <div className="garage">
      <div className="gHead">
        <div className="gHeadL">
          <span className="gTtl">Kho khủng long</span>
          <span className="sectionCount">{dinos.length}</span>
        </div>
        <div className="gHeadR">
          <button
            className="tbtn interactive-region"
            disabled={busyAny && castLeft === 0}
            onClick={castLeft > 0 ? () => { cancelCast.current = true; } : park}
          >
            {castLeft > 0
              ? `Hủy cất (${castLeft}s)`
              : busy === "Park"
                ? "Đang cất…"
                : "Cất con hiện tại"}
          </button>
          {settings?.selfSlayEnabled ? (
            <button className="tbtn ghost interactive-region" disabled={busyAny} onClick={slay}>
              {busy === "Slay" ? "Đang tiêu diệt…" : "Tiêu diệt"}
            </button>
          ) : null}
        </div>
      </div>

      {settings?.liveSwap ? (
        <div className="gNote">Đổi trực tiếp: khủng long hiện tại sẽ được cất và con đã chọn sẽ xuất hiện thay thế.</div>
      ) : null}

      {dinos.length === 0 ? (
        <div className="noData">
          <div className="noDataTtl">Chưa cất khủng long nào</div>
          <div className="noDataSub">Cất một con trong game hoặc dùng nút phía trên.</div>
        </div>
      ) : selected ? (
        <>
          <div className="gViewer interactive-region">
            <DinoModelViewer species={selected.species} palette={selected.palette as SkinPalette} controls />
          </div>

          <div className="gInfo">
            <div className="gNameRow">
              {renaming ? (
                <>
                  <input
                    className="gNameInput interactive-region"
                    value={renameVal}
                    maxLength={32}
                    autoFocus
                    onChange={(e) => setRenameVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void rename(selected, renameVal);
                      if (e.key === "Escape") setRenaming(false);
                    }}
                  />
                  <button
                    className="tbtn interactive-region"
                    disabled={busyAny}
                    onClick={() => void rename(selected, renameVal)}
                  >
                    Lưu
                  </button>
                </>
              ) : (
                <>
                  <span className="gName">{selected.name}</span>
                  {selected.isPrimeElder ? <span className="gElder">ELDER</span> : null}
                  <button
                    className="gEdit interactive-region"
                    title="Đổi tên"
                    onClick={() => {
                      setRenameVal(selected.name);
                      setRenaming(true);
                    }}
                  >
                    ✎
                  </button>
                </>
              )}
            </div>
            <div className="gSub">
              {selected.species} · {genderLabel(selected.gender)} · Trưởng thành {pct(selected.growth)}
            </div>

            <div className="gVitals">
              <GVital label="HP" v={selected.health} color="var(--danger)" />
              <GVital label="Đói" v={selected.hunger} color="var(--amber)" />
              <GVital label="Khát" v={selected.thirst} color="var(--phos)" />
            </div>

            <div className="gActions">
              {selected.mutationEligible && selected.pickableMutations.length >= 3 ? (
                <button
                  className="tbtn interactive-region"
                  disabled={busyAny}
                  onClick={() => {
                    setPicks(["", "", ""]);
                    setPicking((p) => !p);
                  }}
                >
                  {settings?.liveSwap ? "Đổi + chọn đột biến" : "Khôi phục + chọn đột biến"}
                </button>
              ) : (
                <button
                  className="tbtn interactive-region"
                  disabled={busyAny}
                  onClick={() => void restore(selected)}
                >
                  {busy === "Restore" || busy === "Swap"
                    ? "Đang xử lý…"
                    : settings?.liveSwap
                      ? "Đổi sang con này"
                      : "Khôi phục"}
                </button>
              )}
              {settings?.sellingEnabled && selected.sellPrice != null ? (
                <button
                  className="tbtn ghost interactive-region"
                  disabled={busyAny}
                  onClick={() => void sell(selected)}
                >
                  {busy === "Sell" ? "Đang bán…" : `Bán · ${selected.sellPrice.toLocaleString("vi-VN")} ${currencyLabel(settings.currencyName)}`}
                </button>
              ) : null}
            </div>

            {picking ? (
              <div className="gPick">
                {[0, 1, 2].map((i) => (
                  <select
                    key={i}
                    className="gPickSel interactive-region"
                    value={picks[i]}
                    onChange={(e) => {
                      const next = [...picks] as [string, string, string];
                      next[i] = e.target.value;
                      setPicks(next);
                    }}
                  >
                    <option value="">Đột biến {i + 1}…</option>
                    {selected.pickableMutations.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ))}
                <button
                  className="tbtn interactive-region"
                  disabled={busyAny || new Set(picks).size !== 3 || picks.some((p) => !p)}
                  onClick={() => {
                    setPicking(false);
                    void restore(selected, picks);
                  }}
                >
                  Xác nhận
                </button>
              </div>
            ) : null}
          </div>

          <div className="gPills">
            {dinos.map((d) => (
              <button
                key={d.id}
                className={`gPill interactive-region ${d.id === selectedId ? "on" : ""}`}
                onClick={() => {
                  setSelectedId(d.id);
                  setPicking(false);
                  setRenaming(false);
                }}
              >
                {d.name}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {msg ? <div className={`gMsg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}
    </div>
  );
}

function GVital({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="vital">
      <div className="vitalHead">
        <span>{label}</span>
        <span className="mono">{pct(v)}</span>
      </div>
      <div className="vitalTrack">
        <div className="vitalFill" style={{ width: pct(v), background: color }} />
      </div>
    </div>
  );
}
