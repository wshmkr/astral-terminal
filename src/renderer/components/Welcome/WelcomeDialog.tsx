import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Fade from "@mui/material/Fade";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { VscArrowRight } from "react-icons/vsc";
import { type AgentName, agentProviders } from "../../../shared/agent-hooks";
import type { AppThemeId, TerminalThemeId } from "../../../shared/types";
import {
  dismissWelcome,
  setAgentHook,
  setAppTheme,
  setTerminalTheme,
  useWorkspaceStore,
} from "../../store";
import { MONO_FONT_STACK } from "../../theme/fonts";
import {
  APP_PALETTES,
  APP_THEME_OPTIONS,
  DARK_PALETTE,
} from "../../theme/palettes";
import {
  TERMINAL_THEME_OPTIONS,
  TERMINAL_THEMES,
} from "../../theme/terminal-themes";
import {
  HOOKS_HELP_TEXT,
  NO_HOOKS_WARNING_TEXT,
  PROVIDER_ICONS,
} from "../Settings/NotificationsSection";
import { LabeledSelect, SettingRow } from "../Settings/shared";
import { NumberedSection } from "./NumberedSection";
import { ThemePreview } from "./ThemePreview";

const ROOT_SX = {
  position: "absolute",
  inset: 0,
  zIndex: 100,
  bgcolor: DARK_PALETTE.bgPaper,
  overflow: "auto",
  p: 4,
  userSelect: "none",
  alignItems: "center",
  justifyContent: "center",
} as const;

const HEADER_TITLE_SX = {
  mb: 0.5,
  fontFamily: MONO_FONT_STACK,
  fontWeight: 700,
  letterSpacing: "-0.02em",
} as const;
const HEADER_BRAND_SX = { color: "primary.main" } as const;
const SUBTITLE_SX = { color: "text.secondary" } as const;
const PREVIEW_COL_SX = {
  flex: "0 0 480px",
  aspectRatio: "4 / 3",
  alignSelf: "center",
} as const;
const CHECKBOX_SX = { p: 0.5 } as const;
const ALERT_SX = {
  py: 0,
  textWrap: "balance",
  alignItems: "center",
  "& .MuiAlert-message": { py: 0.5, fontSize: 12, lineHeight: 1.4 },
  "& .MuiAlert-icon": { mr: 1, py: 0.5 },
} as const;
const BUTTON_SX = {
  py: 1.5,
  fontSize: 16,
  fontFamily: MONO_FONT_STACK,
  letterSpacing: "0.05em",
} as const;

export function WelcomeDialog() {
  const persistedAppTheme = useWorkspaceStore((s) => s.appearance.appThemeId);
  const persistedTerminalTheme = useWorkspaceStore(
    (s) => s.appearance.terminalThemeId,
  );
  const persistedHooks = useWorkspaceStore(
    (s) => s.notificationSettings.agentHooks,
  );

  const [draftAppTheme, setDraftAppTheme] =
    useState<AppThemeId>(persistedAppTheme);
  const [draftTerminalTheme, setDraftTerminalTheme] = useState<TerminalThemeId>(
    persistedTerminalTheme,
  );
  const [draftHooks, setDraftHooks] = useState<
    Partial<Record<AgentName, boolean>>
  >(() =>
    Object.fromEntries(
      agentProviders.map((p) => [p.name, !!persistedHooks[p.name]]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(true);

  const noHooksEnabled = agentProviders.every((p) => !draftHooks[p.name]);

  const handleGetStarted = async () => {
    setSubmitting(true);
    setAppTheme(draftAppTheme);
    setTerminalTheme(draftTerminalTheme);
    await Promise.allSettled(
      agentProviders
        .filter((p) => !!draftHooks[p.name] !== !!persistedHooks[p.name])
        .map((p) => setAgentHook(p.name, !!draftHooks[p.name])),
    );
    setOpen(false);
  };

  return (
    <Fade in={open} appear={false} timeout={300} onExited={dismissWelcome}>
      <Stack sx={ROOT_SX}>
        <Fade in={open} timeout={500}>
          <Stack
            direction="row"
            spacing={4}
            sx={{ width: "100%", maxWidth: 900 }}
          >
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={HEADER_TITLE_SX}>
                  Welcome to{" "}
                  <Box component="span" sx={HEADER_BRAND_SX}>
                    Astral
                  </Box>
                  .
                </Typography>
                <Typography variant="body2" sx={SUBTITLE_SX}>
                  Configure defaults. Editable anytime via settings.
                </Typography>
              </Box>

              <Stack spacing={4}>
                <NumberedSection index="01" label="Appearance">
                  <LabeledSelect
                    label="App theme"
                    value={draftAppTheme}
                    options={APP_THEME_OPTIONS}
                    onChange={setDraftAppTheme}
                    maxWidth={240}
                  />

                  <LabeledSelect
                    label="Terminal theme"
                    value={draftTerminalTheme}
                    options={TERMINAL_THEME_OPTIONS}
                    onChange={setDraftTerminalTheme}
                    maxWidth={240}
                  />
                </NumberedSection>

                <NumberedSection
                  index="02"
                  label="Install agent hooks"
                  helpText={HOOKS_HELP_TEXT}
                >
                  {agentProviders.map((p) => {
                    const { icon: Icon, color } = PROVIDER_ICONS[p.name];
                    return (
                      <SettingRow
                        key={p.name}
                        title={p.name}
                        icon={<Icon size={16} color={color} />}
                        control={
                          <Checkbox
                            size="small"
                            sx={CHECKBOX_SX}
                            checked={!!draftHooks[p.name]}
                            onChange={(_, checked) =>
                              setDraftHooks((h) => ({
                                ...h,
                                [p.name]: checked,
                              }))
                            }
                          />
                        }
                      />
                    );
                  })}
                </NumberedSection>
              </Stack>

              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Alert
                  severity="error"
                  variant="outlined"
                  sx={[ALERT_SX, !noHooksEnabled && { visibility: "hidden" }]}
                >
                  {NO_HOOKS_WARNING_TEXT}
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleGetStarted}
                  autoFocus
                  disabled={submitting}
                  endIcon={<VscArrowRight />}
                  sx={BUTTON_SX}
                >
                  Get started
                </Button>
              </Stack>
            </Stack>

            <Box sx={PREVIEW_COL_SX}>
              <ThemePreview
                appPalette={APP_PALETTES[draftAppTheme]}
                terminalTheme={TERMINAL_THEMES[draftTerminalTheme]}
              />
            </Box>
          </Stack>
        </Fade>
      </Stack>
    </Fade>
  );
}
