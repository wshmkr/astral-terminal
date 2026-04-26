import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { IconType } from "react-icons";
import { SiClaude } from "react-icons/si";
import { VscQuestion } from "react-icons/vsc";
import { type AgentName, agentProviders } from "../../../shared/agent-hooks";
import {
  setAgentHook,
  updateNotificationSettings,
  useWorkspaceStore,
} from "../../store";
import { DIVIDER_SX, ROOT_SX, SettingRow, SUBHEAD_SX } from "./shared";

const SWITCH_SX = { ml: -1 } as const;

const CHECKBOX_SX = { p: 0.5 } as const;

const HOOKS_HEAD_ROW_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.75,
  mb: -1,
} as const;

const HOOKS_HELP_SX = {
  display: "inline-flex",
  color: "text.disabled",
  cursor: "help",
} as const;

const HOOKS_HELP_TEXT =
  "Install hooks in the agent's settings file so it emits notifications " +
  "and auto-restores sessions in this terminal.";

const PROVIDER_ICONS: Record<AgentName, { icon: IconType; color: string }> = {
  Claude: { icon: SiClaude, color: "#D97757" },
};

export function NotificationsSection() {
  const settings = useWorkspaceStore((s) => s.notificationSettings);
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

  const noHooksEnabled = agentProviders.every(
    (p) => !settings.agentHooks[p.name],
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

      <Box sx={HOOKS_HEAD_ROW_SX}>
        <Typography variant="subtitle1" sx={SUBHEAD_SX}>
          Hooks
        </Typography>
        <Tooltip title={HOOKS_HELP_TEXT} placement="right" arrow>
          <Box component="span" sx={HOOKS_HELP_SX}>
            <VscQuestion size={16} />
          </Box>
        </Tooltip>
      </Box>

      {agentProviders.map((p) => {
        const { icon: Icon, color } = PROVIDER_ICONS[p.name];
        return (
          <SettingRow
            key={p.name}
            title={p.name}
            icon={<Icon size={16} color={color} />}
            error={errors[p.name]}
            control={
              <Checkbox
                size="small"
                sx={CHECKBOX_SX}
                checked={!!settings.agentHooks[p.name]}
                disabled={!!pending[p.name]}
                onChange={(_, checked) => toggleAgentHooks(p.name, checked)}
              />
            }
          />
        );
      })}

      {noHooksEnabled && (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{ mt: "auto", textWrap: "balance", alignItems: "center" }}
        >
          No agent hooks are enabled. Agent-specific notifications (e.g. when
          Claude finishes responding) won't be delivered.
        </Alert>
      )}
    </Box>
  );
}
