import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startNotificationsHost } from "./notifications-window/host";
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

function installDevHelpers() {
  window.showWelcome = () => setWelcomeOpen(true);
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

export function mount(rootEl: HTMLElement): void {
  bootStore()
    .then(() => {
      window.app.setUiZoom(getState().appearance.uiScale);
      startNotificationsHost();
      startSettingsHost();
      if (import.meta.env.DEV) installDevHelpers();
      createRoot(rootEl).render(<ThemedApp />);
    })
    .catch((err) => {
      console.error("Boot failed:", err);
      document.body.textContent = "Failed to start. See console for details.";
    });
}
