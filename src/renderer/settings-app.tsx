import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { styled, ThemeProvider } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { VscChromeClose } from "react-icons/vsc";
import { APP_VERSION } from "../shared/meta";
import type { AccentColorId, SettingsState } from "../shared/types";
import { AppearanceSection } from "./components/Settings/AppearanceSection";
import { NotificationsSection } from "./components/Settings/NotificationsSection";
import { setSettingsStoreState } from "./components/Settings/settings-store-shim";
import { UpdatesSection } from "./components/Settings/UpdatesSection";
import { resolveAccentHex } from "./theme/accent-colors";
import { buildTheme } from "./theme/index";
import { CUSTOM_SCROLLBAR_SX } from "./theme/scrollbar";

const HEADER_HEIGHT = 40;

type SectionId = "appearance" | "notifications" | "updates";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "updates", label: "Updates" },
];

const ROOT_SX = {
  width: "100vw",
  height: "100vh",
  bgcolor: "background.paper",
  backgroundImage: "none",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  userSelect: "none",
  "& input, & textarea": { userSelect: "auto" },
} as const;

const HEADER_SX = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  height: HEADER_HEIGHT,
  bgcolor: "custom.titlebarFocused",
  borderBottom: 1,
  borderColor: "divider",
  userSelect: "none",
  flexShrink: 0,
} as const;

const HEADER_TITLE_SX = {
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  fontSize: "11pt",
  fontWeight: 600,
  color: "text.secondary",
  pointerEvents: "none",
} as const;

const CloseButton = styled(IconButton)(({ theme }) => {
  const vars = theme.vars ?? theme;
  return {
    borderRadius: 0,
    width: 46,
    height: HEADER_HEIGHT,
    color: vars.palette.text.secondary,
    "&:hover": {
      backgroundColor: vars.palette.error.main,
      color: vars.palette.common.white,
    },
  };
});

const BODY_SX = {
  display: "flex",
  flex: 1,
  minHeight: 0,
} as const;

const NAV_SX = {
  width: 180,
  flexShrink: 0,
  borderRight: "1px solid",
  borderColor: "custom.subtleDivider",
  display: "flex",
  flexDirection: "column",
} as const;

const NAV_LIST_SX = {
  flex: 1,
  minHeight: 0,
} as const;

const VERSION_SX = {
  px: 2,
  py: 1,
  fontSize: "10px",
} as const;

const NAV_ITEM_SX = {
  py: 1,
  px: 2.5,
  borderRadius: 0,
  "&.Mui-selected": {
    bgcolor: "action.selected",
    "& .MuiListItemText-primary": { fontWeight: 600 },
    "&:hover": { bgcolor: "action.selected" },
  },
} as const;

const CONTENT_SX = {
  flex: 1,
  p: 2,
  overflowY: "auto",
  ...CUSTOM_SCROLLBAR_SX,
} as const;

export function SettingsApp() {
  const [hydrated, setHydrated] = useState(false);
  const [appThemeId, setAppThemeId] = useState<"dark" | "light">("dark");
  const [accentColorId, setAccentColorId] = useState<AccentColorId>("blue");

  useEffect(
    () =>
      window.app.onSettingsStateChanged((next: SettingsState) => {
        setSettingsStoreState(next);
        setAppThemeId(next.appearance.appThemeId);
        setAccentColorId(next.appearance.accentColorId);
        setHydrated(true);
      }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.app.closeSettingsWindow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const theme = useMemo(
    () => buildTheme(resolveAccentHex(accentColorId)),
    [accentColorId],
  );

  const [section, setSection] = useState<SectionId>("appearance");

  return (
    <ThemeProvider theme={theme} defaultMode={appThemeId}>
      <CssBaseline />
      <Box sx={ROOT_SX}>
        <Box sx={HEADER_SX}>
          <Typography variant="caption" sx={HEADER_TITLE_SX}>
            Settings
          </Typography>
          <CloseButton
            onClick={() => window.app.closeSettingsWindow()}
            aria-label="Close settings"
          >
            <VscChromeClose size={16} />
          </CloseButton>
        </Box>
        {hydrated && (
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
              <Typography
                variant="caption"
                color="text.disabled"
                sx={VERSION_SX}
              >
                v{APP_VERSION}
              </Typography>
            </Box>
            <Box sx={CONTENT_SX}>
              {section === "appearance" && <AppearanceSection />}
              {section === "notifications" && <NotificationsSection />}
              {section === "updates" && <UpdatesSection />}
            </Box>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
