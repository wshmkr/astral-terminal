import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { NotificationsApp } from "./notifications-app";
import { SettingsApp } from "./settings-window/app";
import { startSettingsHost } from "./settings-window/host";
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
  }
}

if (import.meta.env.DEV) {
  window.showWelcome = () => setWelcomeOpen(true);
}

function ThemedApp() {
  const accentColorId = useWorkspaceStore((s) => s.appearance.accentColorId);
  const theme = useMemo(
    () => buildTheme(resolveAccentHex(accentColorId)),
    [accentColorId],
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
  createRoot(rootEl).render(<SettingsApp />);
}

function mountMainApp(rootEl: HTMLElement) {
  bootStore()
    .then(() => {
      window.app.setUiZoom(getState().appearance.uiScale);
      startSettingsHost();
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
