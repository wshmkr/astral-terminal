import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootStore, getState } from "./store";
import { theme } from "./theme";
import "./fonts.css";
import "./components/Terminal/terminal.css";

bootStore();
window.app.setUiZoom(getState().appearance.uiScale);

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");
const root = createRoot(rootEl);
root.render(
  <ThemeProvider theme={theme} defaultMode="dark">
    <CssBaseline />
    <App />
  </ThemeProvider>,
);
