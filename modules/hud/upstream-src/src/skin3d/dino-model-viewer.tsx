import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";

import { hasSkin3D } from "./registry";
import { DEFAULT_GLITCH_LAB, DEFAULT_PALETTE, type SkinPalette } from "./types";

function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      }) ||
      canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
    if (!gl) return false;
    try {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {}
    return true;
  } catch {
    return false;
  }
}

const LazySkinViewer3D = lazy(async () => {
  const mod = await import("./skin-viewer-3d");
  return { default: mod.SkinViewer3D };
});

class Viewer3DErrorBoundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[YETI 3D] preview renderer error", error, info.componentStack);
    this.props.onError(error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function DinoModelViewer({
  species,
  palette = DEFAULT_PALETTE,
  controls = true,
}: {
  species: string;
  palette?: SkinPalette;
  controls?: boolean;
}) {
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [webglReady, setWebglReady] = useState<boolean | null>(null);
  const [viewerFailure, setViewerFailure] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const syncVisibleState = () => {
      const main = document.querySelector<HTMLElement>(".mainWin");
      if (!main) return;
      const shown = main.getClientRects().length > 0 && getComputedStyle(main).visibility !== "hidden";
      setDashboardOpen(shown);
    };

    syncVisibleState();
    const timer = window.setInterval(syncVisibleState, 400);
    const off = window.isleOverlay?.onDash
      ? window.isleOverlay.onDash((open) => setDashboardOpen(Boolean(open)))
      : null;

    return () => {
      window.clearInterval(timer);
      off?.();
    };
  }, []);

  useEffect(() => {
    if (!dashboardOpen) return;
    setWebglReady(supportsWebGL());
  }, [dashboardOpen, retryNonce]);

  const handleViewerFailure = useCallback(() => {
    setViewerFailure(
      "Xem trước 3D gặp lỗi GPU/WebGL. Hãy bấm tải lại 3D để thử lại; các chức năng khác của overlay vẫn hoạt động bình thường.",
    );
  }, []);

  const retryViewer = useCallback(() => {
    setViewerFailure(null);
    setWebglReady(null);
    setRetryNonce((n) => n + 1);
  }, []);

  if (!hasSkin3D(species)) {
    return <div className="skinViewerEmpty">Không có bản xem trước</div>;
  }

  // MainWindow stays mounted while F8 is closed. Stop rendering the Canvas so the
  // hidden dashboard does not keep consuming continuous GPU work.
  if (!dashboardOpen) {
    return <div className="skinViewerEmpty">3D đang tạm nghỉ khi Tổng quan đóng.</div>;
  }

  if (viewerFailure) {
    return (
      <div className="skinViewerEmpty">
        <div>{viewerFailure}</div>
        <button
          type="button"
          className="tbtn interactive-region"
          style={{ marginTop: 10 }}
          onClick={retryViewer}
        >
          Tải lại 3D
        </button>
      </div>
    );
  }

  if (webglReady === null) {
    return <div className="skinViewerEmpty">Đang khởi tạo GPU / WebGL…</div>;
  }

  if (webglReady === false) {
    return (
      <div className="skinViewerEmpty">
        <div>Máy này hiện không khởi tạo được WebGL để hiển thị model 3D.</div>
        <button
          type="button"
          className="tbtn interactive-region"
          style={{ marginTop: 10 }}
          onClick={retryViewer}
        >
          Thử lại 3D
        </button>
      </div>
    );
  }

  return (
    <Viewer3DErrorBoundary key={`${species}:${retryNonce}`} onError={handleViewerFailure}>
      <Suspense fallback={<div className="skinViewerEmpty">Đang tải bản xem trước 3D…</div>}>
        <LazySkinViewer3D
          species={species}
          palette={palette}
          renderMode="standard"
          glitchLab={DEFAULT_GLITCH_LAB}
          controls={controls}
          onContextLost={handleViewerFailure}
        />
      </Suspense>
    </Viewer3DErrorBoundary>
  );
}
