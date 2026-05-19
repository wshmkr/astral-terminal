import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import type { AppearanceSettings } from "../shared/settings-schema";
import type { NotificationPanelItem } from "../shared/types";
import { NotificationPanelBody } from "./components/Sidebar/NotificationPanelBody";
import { DEFAULT_APPEARANCE } from "./store/appearance";
import { buildTheme, resolveColorScheme } from "./theme";
import { resolveAccentHex } from "./theme/accent-colors";

export function NotificationsApp() {
  const [appearance, setAppearance] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [items, setItems] = useState<NotificationPanelItem[]>([]);

  useEffect(() => {
    void window.app.readSettings().then((s) => {
      setAppearance({ ...DEFAULT_APPEARANCE, ...(s?.appearance ?? {}) });
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
    () =>
      buildTheme(
        resolveAccentHex(appearance.accentColorId),
        appearance.appThemeId,
      ),
    [appearance.accentColorId, appearance.appThemeId],
  );

  return (
    <ThemeProvider
      theme={theme}
      defaultMode={resolveColorScheme(appearance.appThemeId)}
    >
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
