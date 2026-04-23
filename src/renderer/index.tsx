import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootStore } from "./store";
import { theme } from "./theme";
import "./fonts.css";
import "./components/Terminal/terminal.css";

bootStore();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");
const root = createRoot(rootEl);
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
);
