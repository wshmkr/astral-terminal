import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import type {
  AppearanceSettings,
  NotificationPanelItem,
} from "../shared/types";
import { NotificationPanelBody } from "./components/Sidebar/NotificationPanelBody";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "./store/appearance";
import { buildTheme } from "./theme";
import { resolveAccentHex } from "./theme/accent-colors";

export function NotificationsApp() {
  const [appearance, setAppearance] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [items, setItems] = useState<NotificationPanelItem[]>([]);

  useEffect(() => {
    void window.app.readSettings().then((s) => {
      setAppearance(normalizeAppearance(s?.appearance));
    });
  }, []);

  useEffect(
    () =>
      window.app.onNotificationPanelItems((next) => {
        setItems(next);
      }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.app.closeNotificationPanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const theme = useMemo(
    () => buildTheme(resolveAccentHex(appearance.accentColorId)),
    [appearance.accentColorId],
  );

  return (
    <ThemeProvider theme={theme} defaultMode={appearance.appThemeId}>
      <CssBaseline />
      <NotificationPanelBody
        items={items}
        onSelect={(n) => {
          window.app.sendNotificationPanelAction({
            kind: "select",
            workspaceId: n.workspaceId,
            paneId: n.paneId,
            surfaceId: n.surfaceId,
            notifId: n.id,
          });
        }}
        onDismiss={(n) => {
          window.app.sendNotificationPanelAction({
            kind: "dismiss",
            workspaceId: n.workspaceId,
            notifId: n.id,
          });
        }}
        onClearAll={() => {
          window.app.sendNotificationPanelAction({ kind: "clearAll" });
        }}
        onClose={() => {
          window.app.closeNotificationPanel();
        }}
      />
    </ThemeProvider>
  );
}
