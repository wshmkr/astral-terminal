import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { type ReactNode, useState } from "react";
import { VscArrowRight, VscQuestion } from "react-icons/vsc";
import { agentProviders } from "../../../shared/agent-hooks";
import type { AppThemeId, TerminalThemeId } from "../../../shared/types";
import { useAgentHookToggle } from "../../hooks/useAgentHookToggle";
import {
  dismissWelcome,
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
  PROVIDER_ICONS,
} from "../Settings/NotificationsSection";
import { LabeledSelect, SettingRow } from "../Settings/shared";
import { ThemePreview } from "./ThemePreview";
import {
  ALERT_SX,
  BACKDROP_SX,
  BUTTON_SX,
  CHECKBOX_SX,
  CONTENT_STACK_SX,
  DIALOG_SX,
  FORM_COL_SX,
  HEADER_BRAND_SX,
  HEADER_TITLE_SX,
  PAPER_SX,
  PREVIEW_COL_SX,
  SECTION_BODY_SX,
  SUBHEAD_HELP_ICON_SX,
  SUBHEAD_INDEX_SX,
  SUBHEAD_LABEL_SX,
  SUBTITLE_SX,
} from "./WelcomeDialog.styles";

interface NumberedSectionProps {
  index: string;
  label: string;
  helpText?: string;
  children: ReactNode;
}

function NumberedSection({
  index,
  label,
  helpText,
  children,
}: NumberedSectionProps) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
        <Typography sx={SUBHEAD_INDEX_SX}>{index}</Typography>
        <Typography sx={SUBHEAD_LABEL_SX}>{label}</Typography>
        {helpText && (
          <Tooltip title={helpText} placement="right" arrow>
            <Box component="span" sx={SUBHEAD_HELP_ICON_SX}>
              <VscQuestion size={16} />
            </Box>
          </Tooltip>
        )}
      </Stack>
      <Stack spacing={1.5} sx={SECTION_BODY_SX}>
        {children}
      </Stack>
    </Stack>
  );
}

export function WelcomeDialog() {
  const persistedAppTheme = useWorkspaceStore((s) => s.appearance.appThemeId);
  const persistedTerminalTheme = useWorkspaceStore(
    (s) => s.appearance.terminalThemeId,
  );
  const hooks = useWorkspaceStore((s) => s.notificationSettings.agentHooks);
  const { toggle, pending, errors } = useAgentHookToggle();

  const [draftAppTheme, setDraftAppTheme] =
    useState<AppThemeId>(persistedAppTheme);
  const [draftTerminalTheme, setDraftTerminalTheme] = useState<TerminalThemeId>(
    persistedTerminalTheme,
  );
  const [open, setOpen] = useState(true);

  const noHooksEnabled = agentProviders.every((p) => !hooks[p.name]);

  const handleGetStarted = () => {
    setAppTheme(draftAppTheme);
    setTerminalTheme(draftTerminalTheme);
    setOpen(false);
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={() => {}}
      slotProps={{
        transition: { onExited: dismissWelcome },
        paper: { elevation: 0, sx: PAPER_SX },
        backdrop: { sx: BACKDROP_SX },
      }}
      sx={DIALOG_SX}
      aria-labelledby="welcome-title"
    >
      <Stack direction="row" spacing={4} sx={CONTENT_STACK_SX}>
        <Stack sx={FORM_COL_SX}>
          <Box sx={{ mb: 4 }}>
            <Typography id="welcome-title" variant="h4" sx={HEADER_TITLE_SX}>
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
                        sx={CHECKBOX_SX}
                        checked={!!hooks[p.name]}
                        disabled={!!pending[p.name]}
                        onChange={(_, checked) => toggle(p.name, checked)}
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
    </Dialog>
  );
}
