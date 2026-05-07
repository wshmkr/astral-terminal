import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { VscArrowRight } from "react-icons/vsc";
import { agentProviders } from "../../../shared/agent-hooks";
import type {
  AccentColorId,
  AppThemeId,
  TerminalThemeId,
} from "../../../shared/types";
import { useAgentHookToggle } from "../../hooks/useAgentHookToggle";
import {
  dismissWelcome,
  setAccentColor,
  setAppTheme,
  setTerminalTheme,
  useWorkspaceStore,
} from "../../store";
import { resolveAccentHex } from "../../theme/accent-colors";
import { MONO_FONT_STACK } from "../../theme/fonts";
import {
  APP_PALETTES,
  APP_THEME_OPTIONS,
  DARK_PALETTE,
  withAccent,
} from "../../theme/palettes";
import {
  TERMINAL_THEME_OPTIONS,
  TERMINAL_THEMES,
} from "../../theme/terminal-themes";
import {
  HooksHelpIcon,
  NoHooksAlert,
  PROVIDER_ICONS,
} from "../Settings/NotificationsSection";
import {
  FIELD_LABEL_SX,
  FIELD_SX,
  LabeledSelect,
  SettingRow,
} from "../Settings/shared";
import { AccentSwatchPicker } from "../ui/AccentSwatchPicker";
import { TITLE_BAR_HEIGHT } from "../ui/TitleBar";
import { ThemePreview } from "./ThemePreview";

const PAPER_SX = {
  userSelect: "none",
  overflow: "auto",
  bgcolor: DARK_PALETTE.bgPaper,
  backgroundImage: "none",
  p: 4,
} as const;

const CONTENT_STACK_SX = {
  width: "100%",
  maxWidth: 900,
  flexShrink: 0,
  m: "auto",
} as const;

const HEADER_TITLE_SX = {
  mb: 0.5,
  fontFamily: MONO_FONT_STACK,
  fontWeight: 700,
  letterSpacing: "-0.02em",
} as const;

const SUBHEAD_BASE_SX = {
  fontFamily: MONO_FONT_STACK,
  fontWeight: 700,
  letterSpacing: "0.08em",
  fontSize: 13,
} as const;
const SUBHEAD_INDEX_SX = {
  ...SUBHEAD_BASE_SX,
  color: "primary.main",
} as const;
const SUBHEAD_LABEL_SX = {
  ...SUBHEAD_BASE_SX,
  textTransform: "uppercase",
  color: "text.primary",
} as const;

const PREVIEW_COL_SX = {
  flex: "0 0 480px",
  aspectRatio: "4 / 3",
  alignSelf: "center",
} as const;

const ALERT_SX = {
  py: 0,
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
  const persistedAccentColor = useWorkspaceStore(
    (s) => s.appearance.accentColorId,
  );
  const hooks = useWorkspaceStore((s) => s.notificationSettings.agentHooks);
  const { toggle, pending, errors } = useAgentHookToggle();

  const [draftAppTheme, setDraftAppTheme] =
    useState<AppThemeId>(persistedAppTheme);
  const [draftTerminalTheme, setDraftTerminalTheme] = useState<TerminalThemeId>(
    persistedTerminalTheme,
  );
  const [draftAccentColor, setDraftAccentColor] =
    useState<AccentColorId>(persistedAccentColor);
  const [open, setOpen] = useState(true);

  const noHooksEnabled = agentProviders.every((p) => !hooks[p.name]);

  const handleGetStarted = () => {
    setAppTheme(draftAppTheme);
    setTerminalTheme(draftTerminalTheme);
    setAccentColor(draftAccentColor);
    setOpen(false);
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={() => {}}
      slotProps={{
        transition: { appear: false, onExited: dismissWelcome },
        paper: { elevation: 0, sx: PAPER_SX },
        backdrop: { sx: { top: TITLE_BAR_HEIGHT }, appear: false },
      }}
      sx={{ top: TITLE_BAR_HEIGHT }}
      aria-labelledby="welcome-title"
    >
      <Stack direction="row" spacing={4} sx={CONTENT_STACK_SX}>
        <Stack sx={{ width: 388, flexShrink: 0 }}>
          <Box sx={{ mb: 4 }}>
            <Typography id="welcome-title" variant="h4" sx={HEADER_TITLE_SX}>
              Welcome to{" "}
              <Box component="span" sx={{ color: "primary.main" }}>
                Astral
              </Box>
              .
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Configure defaults. Editable anytime via settings.
            </Typography>
          </Box>

          <Stack spacing={4}>
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "baseline" }}
              >
                <Typography sx={SUBHEAD_INDEX_SX}>01</Typography>
                <Typography sx={SUBHEAD_LABEL_SX}>Appearance</Typography>
              </Stack>
              <Stack spacing={1.5} sx={{ pl: 3.25 }}>
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
                <Box sx={FIELD_SX}>
                  <Typography sx={FIELD_LABEL_SX}>Accent</Typography>
                  <AccentSwatchPicker
                    value={draftAccentColor}
                    onChange={setDraftAccentColor}
                  />
                </Box>
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
                <HooksHelpIcon sx={{ alignSelf: "center" }} />
              </Stack>
              <Stack spacing={1.5} sx={{ pl: 3.25 }}>
                {agentProviders.map((p) => {
                  const { icon: Icon, color } = PROVIDER_ICONS[p.name];
                  const error = errors[p.name];
                  return (
                    <SettingRow
                      key={p.name}
                      title={p.name}
                      icon={<Icon size={16} color={color} />}
                      description={error}
                      descriptionTone={error ? "error" : "default"}
                      control={
                        <Checkbox
                          size="small"
                          sx={{ p: 0.5 }}
                          checked={!!hooks[p.name]}
                          disabled={!!pending[p.name]}
                          onChange={(_, checked) => toggle(p.name, checked)}
                        />
                      }
                    />
                  );
                })}
              </Stack>
            </Stack>
          </Stack>

          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <NoHooksAlert
              sx={[ALERT_SX, !noHooksEnabled && { visibility: "hidden" }]}
            />
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleGetStarted}
              autoFocus
              endIcon={<VscArrowRight />}
              sx={BUTTON_SX}
            >
              Get started
            </Button>
          </Stack>
        </Stack>

        <Box sx={PREVIEW_COL_SX}>
          <ThemePreview
            appPalette={withAccent(
              APP_PALETTES[draftAppTheme],
              resolveAccentHex(draftAccentColor),
            )}
            terminalTheme={TERMINAL_THEMES[draftTerminalTheme]}
          />
        </Box>
      </Stack>
    </Dialog>
  );
}
