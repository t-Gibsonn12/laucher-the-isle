import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installBrowserDemoBridge } from "./browserDemo";
import { OverlayErrorBoundary } from "./OverlayErrorBoundary";
import { RadarWindow } from "./RadarWindow";
import { installServerLock } from "./serverLock";
import { installWidgetAppearance } from "./widgetAppearance";
import { installGameplayVisibility } from "./gameplayVisibility";
import { installYetiIdentity } from "./yetiIdentity";
import { installOverviewWallet } from "./overviewWallet";
import { installRemovedSkinTab } from "./skinTabRemoval";
import { installDashboardClickThrough } from "./clickThrough";
import "./styles.css";
import "./yetiBrand.css";
import "./widgetAppearance.css";
import "./gameplayVisibility.css";
import "./yetiIdentity.css";
import "./overviewWallet.css";

installBrowserDemoBridge();
installWidgetAppearance();
installGameplayVisibility();
installYetiIdentity();
installOverviewWallet();
installRemovedSkinTab();
installDashboardClickThrough();

async function bootstrap() {
  await installServerLock();

  const isRadar = window.location.hash.replace(/^#/, "").startsWith("radar");

  createRoot(document.getElementById("root")!).render(
    <OverlayErrorBoundary>{isRadar ? <RadarWindow /> : <App />}</OverlayErrorBoundary>,
  );
}

void bootstrap();
