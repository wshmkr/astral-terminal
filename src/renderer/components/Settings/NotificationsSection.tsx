import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import type { SxProps, Theme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { VscQuestion } from "react-icons/vsc";
import {
  agentProviders,
  isAgentHookInstalled,
} from "../../../shared/agent-hooks";
import {
  setAgentHook,
  updateNotificationSettings,
  useSettingsStore,
} from "../../settings-window/store";
import { AgentHookRows } from "./AgentHookRows";
import {
  DIVIDER_SX,
  ROOT_SX,
  SettingRow,
  SUBHEAD_SX,
  SWITCH_SX,
} from "./shared";

const HOOKS_HELP_ICON_SX = {
  display: "inline-flex",
  color: "text.disabled",
  cursor: "help",
} as const;

const HOOKS_HELP_TEXT =
  "Install hooks in the agent's settings to emit notifications " +
  "and auto-restore sessions in Astral Terminal.";

const NO_HOOKS_WARNING_TEXT =
  "No agent hooks are configured. Agent-specific notifications " +
  "(e.g. when Claude finishes responding) won't be delivered.";

const NO_HOOKS_ALERT_BASE_SX = {
  textWrap: "balance",
  alignItems: "center",
} as const;

export function HooksHelpIcon({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Tooltip title={HOOKS_HELP_TEXT} placement="right" arrow>
      <Box
        component="span"
        sx={[HOOKS_HELP_ICON_SX, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        <VscQuestion size={16} />
      </Box>
    </Tooltip>
  );
}

export function NoHooksAlert({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Alert
      severity="error"
      variant="outlined"
      sx={[NO_HOOKS_ALERT_BASE_SX, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {NO_HOOKS_WARNING_TEXT}
    </Alert>
  );
}

export function NotificationsSection() {
  const settings = useSettingsStore((s) => s.notificationSettings);
  const hookStatuses = useSettingsStore((s) => s.agentHookStatuses);

  const noHooksEnabled = agentProviders.every(
    (p) => !isAgentHookInstalled(hookStatuses[p.name]),
  );

  return (
    <Box sx={ROOT_SX}>
      <SettingRow
        title="Desktop notifications"
        control={
          <Switch
            size="small"
            sx={SWITCH_SX}
            checked={settings.osNotificationsEnabled}
            onChange={(_, checked) =>
              updateNotificationSettings({ osNotificationsEnabled: checked })
            }
          />
        }
      />

      <SettingRow
        title="Notification sound"
        control={
          <Switch
            size="small"
            sx={SWITCH_SX}
            checked={settings.soundEnabled}
            onChange={(_, checked) =>
              updateNotificationSettings({ soundEnabled: checked })
            }
          />
        }
      />

      <Divider sx={DIVIDER_SX} />

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: "center", mb: -1 }}
      >
        <Typography variant="subtitle1" sx={SUBHEAD_SX}>
          Hooks
        </Typography>
        <HooksHelpIcon />
      </Stack>

      <AgentHookRows hookStatuses={hookStatuses} setAgentHook={setAgentHook} />

      {noHooksEnabled && <NoHooksAlert sx={{ mt: "auto" }} />}
    </Box>
  );
}
