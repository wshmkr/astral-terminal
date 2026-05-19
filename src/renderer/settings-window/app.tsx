import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { ThemeProvider } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { VscChromeClose } from "react-icons/vsc";
import { APP_GITHUB_SLUG, APP_VERSION } from "../../shared/meta";
import { SETTINGS_FADE_EASING, SETTINGS_FADE_MS } from "../../shared/types";
import { AppearanceSection } from "../components/Settings/AppearanceSection";
import { AstralSection } from "../components/Settings/AstralSection";
import { NotificationsSection } from "../components/Settings/NotificationsSection";
import { TitleBarButton } from "../components/ui/TitleBarButton";
import { resolveAccentHex } from "../theme/accent-colors";
import { buildTheme, resolveColorScheme } from "../theme/index";
import {
  BODY_SX,
  CONTENT_SX,
  HEADER_SX,
  HEADER_TITLE_SX,
  NAV_ITEM_SX,
  NAV_LIST_SX,
  NAV_SX,
  ROOT_SX,
  UPDATE_BADGE_SX,
  VERSION_SX,
  VERSION_TEXT_SX,
} from "./app.styles";
import { setSettingsStoreState, useSettingsState } from "./store";

type SectionId = "appearance" | "notifications" | "astral";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "astral", label: "Astral Terminal" },
];

export function SettingsApp() {
  const state = useSettingsState();
  const [visible, setVisible] = useState(false);

  useEffect(() => window.app.onSettingsStateChanged(setSettingsStoreState), []);
  useEffect(() => window.app.onSettingsFade(setVisible), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.app.closeSettingsWindow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;
    window.app.requestUpdateCheck().catch((err) => {
      console.error("Update check failed:", err);
    });
  }, [visible]);

  const appThemeId = state?.appearance.appThemeId ?? "dark";
  const accentColorId = state?.appearance.accentColorId ?? "blue";

  const theme = useMemo(
    () => buildTheme(resolveAccentHex(accentColorId), appThemeId),
    [accentColorId, appThemeId],
  );

  const [section, setSection] = useState<SectionId>("appearance");

  return (
    <ThemeProvider theme={theme} defaultMode={resolveColorScheme(appThemeId)}>
      <CssBaseline />
      <GlobalStyles styles={{ body: { backgroundColor: "transparent" } }} />
      <Box
        sx={{
          ...ROOT_SX,
          opacity: visible ? 1 : 0,
          transition: `opacity ${SETTINGS_FADE_MS}ms ${SETTINGS_FADE_EASING}`,
        }}
      >
        <Box sx={HEADER_SX}>
          <Typography variant="caption" sx={HEADER_TITLE_SX}>
            Settings
          </Typography>
          <TitleBarButton
            $dimmed={false}
            $isClose
            onClick={() => window.app.closeSettingsWindow()}
            aria-label="Close settings"
          >
            <VscChromeClose size={16} />
          </TitleBarButton>
        </Box>
        {state && (
          <Box sx={BODY_SX}>
            <Box sx={NAV_SX}>
              <List sx={NAV_LIST_SX} disablePadding>
                {SECTIONS.map((s) => (
                  <ListItemButton
                    key={s.id}
                    sx={NAV_ITEM_SX}
                    selected={section === s.id}
                    onClick={() => setSection(s.id)}
                  >
                    <ListItemText
                      primary={s.label}
                      slotProps={{ primary: { variant: "body2" } }}
                    />
                  </ListItemButton>
                ))}
              </List>
              <Box sx={VERSION_SX}>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={VERSION_TEXT_SX}
                  onClick={() =>
                    window.app.openExternal(
                      `https://github.com/${APP_GITHUB_SLUG}/releases/tag/v${APP_VERSION}`,
                    )
                  }
                >
                  v{APP_VERSION}
                </Typography>
                {state.updateStatus.state === "downloaded" && (
                  <Box
                    component="span"
                    sx={UPDATE_BADGE_SX}
                    onClick={() => setSection("astral")}
                  >
                    update ready
                  </Box>
                )}
              </Box>
            </Box>
            <Box sx={CONTENT_SX}>
              {section === "appearance" && <AppearanceSection />}
              {section === "notifications" && <NotificationsSection />}
              {section === "astral" && <AstralSection />}
            </Box>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
