import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { SiClaude } from "react-icons/si";
import { agentProviders } from "../../../shared/agent-hooks";
import {
  setAgentHookEnabled,
  updateNotificationSettings,
  useWorkspaceStore,
} from "../../store";
import { DIVIDER_SX, ROOT_SX, SettingRow, SUBHEAD_SX } from "./shared";

const SWITCH_SX = { ml: -1 } as const;

const CHECKBOX_SX = { p: 0.5 } as const;

const HOOKS_SUBHEAD_SX = { ...SUBHEAD_SX, mb: -1 } as const;

export function NotificationsSection() {
  const settings = useWorkspaceStore((s) => s.notificationSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  async function toggleAgentHooks(name: string, enabled: boolean) {
    setPending((p) => ({ ...p, [name]: true }));
    setErrors((e) => {
      const { [name]: _, ...rest } = e;
      return rest;
    });
    try {
      const result = enabled
        ? await window.app.configureAgentHooks({ providerName: name })
        : await window.app.uninstallAgentHooks({ providerName: name });
      if (result.status === "error") {
        setErrors((e) => ({ ...e, [name]: result.message }));
        return;
      }
      setAgentHookEnabled(name, enabled);
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
    <Box sx={ROOT_SX}>
      <SettingRow
        title="OS notifications"
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
        title="Play sound"
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

      <Typography variant="subtitle1" sx={HOOKS_SUBHEAD_SX}>
        Hooks
      </Typography>

      {agentProviders.map((p) => (
        <SettingRow
          key={p.name}
          title={p.name}
          icon={
            p.name === "Claude" ? (
              <SiClaude size={16} color="#D97757" />
            ) : undefined
          }
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
      ))}
    </Box>
  );
}
