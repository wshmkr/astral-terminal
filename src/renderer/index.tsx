import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
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

bootStore()
  .then(() => {
    window.app.setUiZoom(getState().appearance.uiScale);
    const rootEl = document.getElementById("root");
    if (!rootEl) throw new Error("Root element #root not found");
    const root = createRoot(rootEl);
    root.render(<ThemedApp />);
  })
  .catch((err) => {
    console.error("Boot failed:", err);
    document.body.textContent = "Failed to start. See console for details.";
  });
