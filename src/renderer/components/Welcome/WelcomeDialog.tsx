import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Fade from "@mui/material/Fade";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { SiClaude } from "react-icons/si";
import { VscArrowRight, VscQuestion } from "react-icons/vsc";
import { type AgentName, agentProviders } from "../../../shared/agent-hooks";
import type { AppThemeId, TerminalThemeId } from "../../../shared/types";
import {
  dismissWelcome,
  setAgentHook,
  setAppTheme,
  setTerminalTheme,
  useWorkspaceStore,
} from "../../store";
import { FONT_BY_ID } from "../../theme/fonts";
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
} from "../Settings/NotificationsSection";
import { LabeledSelect, SettingRow } from "../Settings/shared";
import { ThemePreview } from "./ThemePreview";

const ROOT_SX = {
  position: "absolute",
  inset: 0,
  zIndex: 100,
  bgcolor: DARK_PALETTE.bgPaper,
  overflow: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  p: 4,
  userSelect: "none",
} as const;

const CONTENT_SX = { width: "100%", maxWidth: 900 } as const;
const MONO_FONT = FONT_BY_ID["jetbrains-mono"].stack;

const HEADER_TITLE_SX = {
  mb: 0.5,
  fontFamily: MONO_FONT,
  fontWeight: 700,
  letterSpacing: "-0.02em",
} as const;
const HEADER_BRAND_SX = { color: "primary.main" } as const;
const SUBHEAD_LABEL_SX = {
  fontFamily: MONO_FONT,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 13,
  color: "text.primary",
} as const;
const SUBHEAD_INDEX_SX = {
  fontFamily: MONO_FONT,
  fontWeight: 700,
  letterSpacing: "0.08em",
  fontSize: 13,
  color: "primary.main",
} as const;
const SUBTITLE_SX = { color: "text.secondary" } as const;
const HEADER_BLOCK_SX = { mb: 4 } as const;
const SETTINGS_COL_SX = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
} as const;
const PREVIEW_COL_SX = {
  flex: "0 0 480px",
  aspectRatio: "4 / 3",
  alignSelf: "center",
} as const;
const CHECKBOX_SX = { p: 0.5 } as const;
const HOOKS_HELP_SX = {
  display: "inline-flex",
  alignSelf: "center",
  color: "text.disabled",
  cursor: "help",
} as const;
const SECTION_BODY_SX = { pl: 3.25 } as const;
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
  fontFamily: MONO_FONT,
  letterSpacing: "0.05em",
} as const;

const ACCENT_COLOR_OPTIONS = [
  {
    value: "blue",
    label: (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: "#0078d4",
          }}
        />
        Blue
      </Box>
    ),
  },
];

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
      <Box sx={ROOT_SX}>
        <Fade in={open} timeout={500}>
          <Box sx={CONTENT_SX}>
            <Stack direction="row" spacing={4} sx={{ alignItems: "stretch" }}>
              <Box sx={SETTINGS_COL_SX}>
                <Box sx={HEADER_BLOCK_SX}>
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
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "baseline" }}
                    >
                      <Typography sx={SUBHEAD_INDEX_SX}>01</Typography>
                      <Typography sx={SUBHEAD_LABEL_SX}>Appearance</Typography>
                    </Stack>

                    <Stack spacing={1.5} sx={SECTION_BODY_SX}>
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

                      <LabeledSelect
                        label="Accent color"
                        value="blue"
                        options={ACCENT_COLOR_OPTIONS}
                        onChange={() => {}}
                        maxWidth={240}
                      />
                    </Stack>
                  </Stack>

                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "baseline" }}
                    >
                      <Typography sx={SUBHEAD_INDEX_SX}>02</Typography>
                      <Typography sx={SUBHEAD_LABEL_SX}>
                        Install agent hooks
                      </Typography>
                      <Tooltip title={HOOKS_HELP_TEXT} placement="right" arrow>
                        <Box component="span" sx={HOOKS_HELP_SX}>
                          <VscQuestion size={16} />
                        </Box>
                      </Tooltip>
                    </Stack>

                    <Stack spacing={1.5} sx={SECTION_BODY_SX}>
                      {agentProviders.map((p) => (
                        <SettingRow
                          key={p.name}
                          title={p.name}
                          icon={<SiClaude size={16} color="#D97757" />}
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
                      ))}
                    </Stack>
                  </Stack>
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
              </Box>

              <Box sx={PREVIEW_COL_SX}>
                <ThemePreview
                  appPalette={APP_PALETTES[draftAppTheme]}
                  terminalTheme={TERMINAL_THEMES[draftTerminalTheme]}
                />
              </Box>
            </Stack>
          </Box>
        </Fade>
      </Box>
    </Fade>
  );
}
