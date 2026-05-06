import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { SiClaude } from "react-icons/si";
import { VscQuestion } from "react-icons/vsc";
import { type AgentName, agentProviders } from "../../../shared/agent-hooks";
import type { AppThemeId, TerminalThemeId } from "../../../shared/types";
import {
  dismissWelcome,
  setAgentHook,
  setAppTheme,
  setTerminalTheme,
  useWorkspaceStore,
} from "../../store";
import { APP_PALETTES, APP_THEME_OPTIONS } from "../../theme/palettes";
import {
  TERMINAL_THEME_OPTIONS,
  TERMINAL_THEMES,
} from "../../theme/terminal-themes";
import {
  HOOKS_HELP_TEXT,
  NO_HOOKS_WARNING_TEXT,
} from "../Settings/NotificationsSection";
import {
  DIVIDER_SX,
  LabeledSelect,
  SettingRow,
  SUBHEAD_SX,
} from "../Settings/shared";
import { ThemePreview } from "./ThemePreview";

const PAPER_SX = {
  width: 640,
  maxWidth: "calc(100vw - 48px)",
  bgcolor: "background.paper",
  backgroundImage: "none",
  borderRadius: 1,
  overflow: "hidden",
  userSelect: "none",
} as const;

const CONTENT_SX = {
  px: 3,
  pt: 3,
  pb: 1,
} as const;

const HEADER_TITLE_SX = { mb: 0.5 } as const;
const SUBTITLE_SX = { color: "text.secondary", mb: 2 } as const;
const SETTINGS_COL_SX = { flex: 1, minWidth: 0 } as const;
const PREVIEW_COL_SX = {
  flex: "0 0 340px",
  aspectRatio: "4 / 3",
} as const;
const CHECKBOX_SX = { p: 0.5 } as const;
const HOOKS_HELP_SX = {
  display: "inline-flex",
  color: "text.disabled",
  cursor: "help",
} as const;
const ALERT_SX = {
  flex: 1,
  py: 0,
  textWrap: "balance",
  alignItems: "center",
  "& .MuiAlert-message": { py: 0.5, fontSize: 12, lineHeight: 1.4 },
  "& .MuiAlert-icon": { mr: 1, py: 0.5 },
} as const;
const ACTIONS_SX = { px: 3, pb: 2, pt: 1, gap: 1.5 } as const;
const BUTTON_SX = { py: 1.25 } as const;

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
    dismissWelcome();
  };

  return (
    <Dialog open slotProps={{ paper: { sx: PAPER_SX } }}>
      <Box sx={CONTENT_SX}>
        <Typography variant="h5" sx={HEADER_TITLE_SX}>
          Welcome to Astral Terminal
        </Typography>
        <Typography variant="body2" sx={SUBTITLE_SX}>
          Let's get you set up. You can change everything later in Settings.
        </Typography>

        <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
          <Stack spacing={1.5} sx={SETTINGS_COL_SX}>
            <Typography variant="subtitle1" sx={SUBHEAD_SX}>
              Appearance
            </Typography>

            <LabeledSelect
              label="App theme"
              value={draftAppTheme}
              options={APP_THEME_OPTIONS}
              onChange={setDraftAppTheme}
            />

            <LabeledSelect
              label="Terminal theme"
              value={draftTerminalTheme}
              options={TERMINAL_THEME_OPTIONS}
              onChange={setDraftTerminalTheme}
            />

            <Divider sx={DIVIDER_SX} />

            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle1" sx={SUBHEAD_SX}>
                Install agent hooks
              </Typography>
              <Tooltip title={HOOKS_HELP_TEXT} placement="right" arrow>
                <Box component="span" sx={HOOKS_HELP_SX}>
                  <VscQuestion size={16} />
                </Box>
              </Tooltip>
            </Stack>

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
                      setDraftHooks((h) => ({ ...h, [p.name]: checked }))
                    }
                  />
                }
              />
            ))}
          </Stack>

          <Box sx={PREVIEW_COL_SX}>
            <ThemePreview
              appPalette={APP_PALETTES[draftAppTheme]}
              terminalTheme={TERMINAL_THEMES[draftTerminalTheme]}
            />
          </Box>
        </Stack>
      </Box>

      <DialogActions sx={ACTIONS_SX}>
        {noHooksEnabled && (
          <Alert severity="warning" variant="outlined" sx={ALERT_SX}>
            {NO_HOOKS_WARNING_TEXT}
          </Alert>
        )}
        <Button
          variant="contained"
          onClick={handleGetStarted}
          autoFocus
          disabled={submitting}
          sx={BUTTON_SX}
        >
          Get started
        </Button>
      </DialogActions>
    </Dialog>
  );
}
