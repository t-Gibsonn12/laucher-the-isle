import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { error: Error | null };

export class OverlayErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[YETI UI] renderer error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="overlay" style={{ display: "grid", placeItems: "center", pointerEvents: "auto" }}>
        <div className="frame" style={{ width: 440, maxWidth: "90vw", padding: 18 }}>
          <div className="noDataTtl">Overlay gặp lỗi ở mục vừa mở</div>
          <div className="noDataSub" style={{ marginTop: 8 }}>
            Giao diện được giữ lại thay vì đóng cả ứng dụng. Hãy khởi động lại overlay rồi thử lại.
          </div>
          <div className="noDataSub" style={{ marginTop: 8, opacity: 0.7, wordBreak: "break-word" }}>
            {this.state.error.message || "Lỗi giao diện không xác định"}
          </div>
          <button className="steamBtn interactive-region" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>
            Khởi động lại overlay
          </button>
        </div>
      </div>
    );
  }
}
