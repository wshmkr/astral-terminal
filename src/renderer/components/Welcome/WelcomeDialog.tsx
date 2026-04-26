import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { SiClaude } from "react-icons/si";
import { type AgentName, agentProviders } from "../../../shared/agent-hooks";
import {
  dismissWelcome,
  setAgentHook,
  setAppTheme,
  setTerminalTheme,
  useWorkspaceStore,
} from "../../store";
import { APP_THEME_OPTIONS } from "../../theme/palettes";
import { TERMINAL_THEME_OPTIONS } from "../../theme/terminal-themes";
import {
  DIVIDER_SX,
  LabeledSelect,
  ROOT_SX,
  SettingRow,
  SUBHEAD_SX,
} from "../Settings/shared";

const PAPER_SX = {
  width: 520,
  maxWidth: "calc(100vw - 48px)",
  bgcolor: "background.paper",
  backgroundImage: "none",
  borderRadius: 1,
  overflow: "hidden",
  userSelect: "none",
  "& input, & textarea": { userSelect: "auto" },
} as const;

const CONTENT_SX = {
  px: 3,
  pt: 3,
  pb: 1,
} as const;

const HEADER_SX = {
  mb: 2,
} as const;

const SUBTITLE_SX = {
  color: "text.secondary",
  mt: 0.5,
} as const;

const CHECKBOX_SX = { p: 0.5 } as const;

const ACTIONS_SX = {
  px: 3,
  pb: 2,
  pt: 1,
} as const;

const APP_THEME_OPTS = APP_THEME_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));

const TERMINAL_THEME_OPTS = TERMINAL_THEME_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));

const PROVIDER_ICONS: Record<AgentName, { color: string }> = {
  Claude: { color: "#D97757" },
};

interface Props {
  open: boolean;
}

export function WelcomeDialog({ open }: Props) {
  const appThemeId = useWorkspaceStore((s) => s.appearance.appThemeId);
  const terminalThemeId = useWorkspaceStore(
    (s) => s.appearance.terminalThemeId,
  );
  const agentHooks = useWorkspaceStore(
    (s) => s.notificationSettings.agentHooks,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  async function toggleAgentHooks(name: AgentName, enabled: boolean) {
    setPending((p) => ({ ...p, [name]: true }));
    setErrors((e) => {
      const { [name]: _, ...rest } = e;
      return rest;
    });
    try {
      const result = await setAgentHook(name, enabled);
      if (result.status === "error") {
        setErrors((e) => ({ ...e, [name]: result.message }));
      }
    } catch (err) {
      setErrors((e) => ({ ...e, [name]: String(err) }));
    } finally {
      setPending((p) => {
        const { [name]: _, ...rest } = p;
        return rest;
      });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      slotProps={{ paper: { sx: PAPER_SX } }}
    >
      <Box sx={CONTENT_SX}>
        <Box sx={HEADER_SX}>
          <Typography variant="h5">Welcome to Astral</Typography>
          <Typography variant="body2" sx={SUBTITLE_SX}>
            Let's get you set up. You can change everything later in Settings.
          </Typography>
        </Box>

        <Box sx={ROOT_SX}>
          <Typography variant="subtitle1" sx={SUBHEAD_SX}>
            Appearance
          </Typography>

          <LabeledSelect
            label="App theme"
            value={appThemeId}
            options={APP_THEME_OPTS}
            onChange={setAppTheme}
            maxWidth={200}
          />

          <LabeledSelect
            label="Terminal theme"
            value={terminalThemeId}
            options={TERMINAL_THEME_OPTS}
            onChange={setTerminalTheme}
            maxWidth={240}
          />

          <Divider sx={DIVIDER_SX} />

          <Typography variant="subtitle1" sx={SUBHEAD_SX}>
            Notifications
          </Typography>

          {agentProviders.map((p) => {
            const { color } = PROVIDER_ICONS[p.name];
            const error = errors[p.name];
            return (
              <SettingRow
                key={p.name}
                title={p.name}
                icon={<SiClaude size={16} color={color} />}
                description={
                  error ?? `Get desktop notifications when ${p.name} pauses.`
                }
                descriptionTone={error ? "error" : "default"}
                control={
                  <Checkbox
                    size="small"
                    sx={CHECKBOX_SX}
                    checked={!!agentHooks[p.name]}
                    disabled={!!pending[p.name]}
                    onChange={(_, checked) => toggleAgentHooks(p.name, checked)}
                  />
                }
              />
            );
          })}
        </Box>
      </Box>

      <DialogActions sx={ACTIONS_SX}>
        <Button
          variant="contained"
          size="medium"
          onClick={dismissWelcome}
          autoFocus
        >
          Get started
        </Button>
      </DialogActions>
    </Dialog>
  );
}
