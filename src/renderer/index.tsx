import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import type { UpdateState, UpdateStatus } from "../shared/types";
import { App } from "./App";
import { NotificationsApp } from "./notifications-app";
import { SettingsApp } from "./settings-window/app";
import { startSettingsHost } from "./settings-window/host";
import { patchLocalUpdateStatus } from "./settings-window/store";
import {
  bootStore,
  getState,
  setWelcomeOpen,
  useWorkspaceStore,
} from "./store";
import { buildTheme } from "./theme";
import { resolveAccentHex } from "./theme/accent-colors";
import "./fonts.css";
import "./components/Terminal/terminal.css";

declare global {
  interface Window {
    showWelcome?: () => void;
    setUpdateState?: (state: UpdateState) => void;
  }
}

const DEV_UPDATE_STATUS: Record<UpdateState, () => UpdateStatus> = {
  idle: () => ({ state: "idle", lastCheckedAt: null }),
  checking: () => ({ state: "checking", lastCheckedAt: Date.now() }),
  "not-available": () => ({
    state: "not-available",
    lastCheckedAt: Date.now(),
  }),
  downloading: () => ({
    state: "downloading",
    lastCheckedAt: Date.now(),
  }),
  downloaded: () => ({
    state: "downloaded",
    lastCheckedAt: Date.now(),
    version: "0.0.0-dev",
  }),
  error: () => ({
    state: "error",
    lastCheckedAt: Date.now(),
    errorMessage: "Simulated dev error",
  }),
};

function installMainDevHelpers() {
  window.showWelcome = () => setWelcomeOpen(true);
}

function installSettingsDevHelpers() {
  window.setUpdateState = (state) =>
    patchLocalUpdateStatus(DEV_UPDATE_STATUS[state]());
}

function ThemedApp() {
  const accentColorId = useWorkspaceStore((s) => s.appearance.accentColorId);
  const appThemeId = useWorkspaceStore((s) => s.appearance.appThemeId);
  const theme = useMemo(
    () => buildTheme(resolveAccentHex(accentColorId), appThemeId),
    [accentColorId, appThemeId],
  );
  return (
    <ThemeProvider theme={theme} defaultMode="dark">
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

function mountNotificationsApp(rootEl: HTMLElement) {
  rootEl.style.height = "100vh";
  createRoot(rootEl).render(<NotificationsApp />);
}

function mountSettingsApp(rootEl: HTMLElement) {
  rootEl.style.height = "100vh";
  if (import.meta.env.DEV) installSettingsDevHelpers();
  createRoot(rootEl).render(<SettingsApp />);
}

function mountMainApp(rootEl: HTMLElement) {
  bootStore()
    .then(() => {
      window.app.setUiZoom(getState().appearance.uiScale);
      startSettingsHost();
      if (import.meta.env.DEV) installMainDevHelpers();
      createRoot(rootEl).render(<ThemedApp />);
    })
    .catch((err) => {
      console.error("Boot failed:", err);
      document.body.textContent = "Failed to start. See console for details.";
    });
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

if (window.location.hash === "#notifications") {
  mountNotificationsApp(rootEl);
} else if (window.location.hash === "#settings") {
  mountSettingsApp(rootEl);
} else {
  mountMainApp(rootEl);
}
