import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useEffect, useMemo } from "react";
import { NotificationPanelBody } from "../components/Sidebar/NotificationPanelBody";
import { resolveAccentHex } from "../theme/accent-colors";
import { buildTheme } from "../theme/index";
import { ROOT_SX } from "./app.styles";
import {
  clearAll,
  dismiss,
  select,
  setNotificationStoreState,
  useNotificationPanelState,
} from "./store";

export function NotificationsApp() {
  const state = useNotificationPanelState();

  useEffect(
    () => window.app.onNotificationPanelStateChanged(setNotificationStoreState),
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.app.closeNotificationPanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const appThemeId = state?.appearance.appThemeId ?? "dark";
  const accentColorId = state?.appearance.accentColorId ?? "blue";

  const theme = useMemo(
    () => buildTheme(resolveAccentHex(accentColorId)),
    [accentColorId],
  );

  return (
    <ThemeProvider theme={theme} defaultMode={appThemeId}>
      <CssBaseline />
      <Box sx={ROOT_SX}>
        {state && (
          <NotificationPanelBody
            items={state.items}
            onSelect={(n) => select(n.workspaceId, n.paneId, n.surfaceId, n.id)}
            onDismiss={(n) => dismiss(n.workspaceId, n.id)}
            onClearAll={clearAll}
            onClose={() => window.app.closeNotificationPanel()}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}
