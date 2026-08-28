import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MapPlayerShape, MapZoneShape } from "./livemap/MapCanvas";
import { worldToNormalized, type MapCalibration } from "./livemap/calibration";
import { RadarView, type RadarMarker } from "./RadarView";
import type { LiveFrame } from "./preload";

type MapResp = {
  calibration?: MapCalibration | null;
  pois?: MapZoneShape[];
  markers?: MapPlayerShape[];
  error?: string;
  status?: number;
};

type RadarPosition = {
  x: number;
  y: number;
  yaw?: number | null;
};

const RANGE_UV = [0.05, 0.1, 0.2, 0.4];
const RANGE_LABEL = ["GẦN", "VỪA", "XA", "TỐI ĐA"];

function centroidUV(cal: MapCalibration, points: { x: number; y: number }[]): { u: number; v: number } | null {
  if (!points.length) return null;
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return worldToNormalized(cal, cx, cy);
}

export function RadarPanel({
  live,
  base,
  rangeIdx,
  showLabels,
  diameter,
}: {
  live: LiveFrame | null;
  base: string;
  rangeIdx: number;
  showLabels: boolean;
  diameter: number;
}) {
  const [data, setData] = useState<MapResp | null>(null);
  const lastPosition = useRef<RadarPosition | null>(null);

  const refresh = useCallback(async () => {
    const r = (await window.isleOverlay.apiGet<MapResp>("/api/overlay/map")) as MapResp;
    // Keep the last known-good map/calibration if the backend has a temporary hiccup.
    // Replacing it with an error response makes the mini map flash to "MẤT TÍN HIỆU".
    if (!r.error) setData(r);
  }, []);

  useEffect(() => {
    void refresh();
    // The map endpoint can also provide our own player marker. Poll it often enough to
    // serve as a position fallback when /ows is quiet or temporarily returns 504.
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const cal = data?.calibration ?? null;
  const selfMarker = useMemo(() => (data?.markers ?? []).find((m) => m.self) ?? null, [data]);

  useEffect(() => {
    if (live?.hasDino === false) {
      lastPosition.current = null;
      return;
    }
    if (live?.position) {
      lastPosition.current = {
        x: live.position.x,
        y: live.position.y,
        yaw: live.position.yaw ?? null,
      };
      return;
    }
    if (selfMarker) {
      lastPosition.current = {
        x: selfMarker.x,
        y: selfMarker.y,
        yaw: selfMarker.yaw ?? null,
      };
    }
  }, [live?.hasDino, live?.position?.x, live?.position?.y, live?.position?.yaw, selfMarker?.x, selfMarker?.y, selfMarker?.yaw]);

  const position = useMemo<RadarPosition | null>(() => {
    if (live?.position) {
      return {
        x: live.position.x,
        y: live.position.y,
        yaw: live.position.yaw ?? null,
      };
    }
    if (selfMarker) {
      return {
        x: selfMarker.x,
        y: selfMarker.y,
        yaw: selfMarker.yaw ?? null,
      };
    }
    return lastPosition.current;
  }, [live?.position, selfMarker]);

  const selfUV = useMemo(() => {
    if (!cal || !position) return null;
    return worldToNormalized(cal, position.x, position.y);
  }, [cal, position]);

  const headingDeg = useMemo(() => {
    if (!cal || !position || position.yaw == null || !selfUV) return null;
    const rad = (position.yaw * Math.PI) / 180;
    const ahead = worldToNormalized(cal, position.x + 1000 * Math.cos(rad), position.y + 1000 * Math.sin(rad));
    return (Math.atan2(ahead.v - selfUV.v, ahead.u - selfUV.u) * 180) / Math.PI;
  }, [cal, position, selfUV]);

  const markers = useMemo<RadarMarker[]>(() => {
    if (!cal) return [];
    const out: RadarMarker[] = [];
    for (const p of data?.pois ?? []) {
      const uv = centroidUV(cal, p.points);
      if (uv) out.push({ id: p.id, u: uv.u, v: uv.v, label: p.name, color: p.color, kind: "place", shape: p.shape, icon: p.icon });
    }
    for (const m of data?.markers ?? []) {
      if (m.self) continue;
      const uv = worldToNormalized(cal, m.x, m.y);
      out.push({ id: m.steamId, u: uv.u, v: uv.v, label: m.label, color: "#7cf2a6", kind: "friend" });
    }
    return out;
  }, [cal, data]);

  return (
    <div className="radarPanel dragHandle">
      <RadarView
        layerBase={`${base}/maps/gateway-v0.21`}
        diameter={diameter}
        selfU={selfUV?.u ?? null}
        selfV={selfUV?.v ?? null}
        headingDeg={headingDeg}
        rangeUV={RANGE_UV[rangeIdx]}
        rangeLabel={RANGE_LABEL[rangeIdx]}
        markers={markers}
        showLabels={showLabels}
      />
    </div>
  );
}
