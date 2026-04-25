import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { agentProviders } from "../../../shared/agent-hooks";
import {
  setAgentHookEnabled,
  updateNotificationSettings,
  useWorkspaceStore,
} from "../../store";

const ROOT_SX = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
} as const;

const DESC_SX = {
  color: "text.secondary",
  fontSize: 12,
  ml: 5.5,
  mt: -1,
} as const;

const SUBHEAD_SX = {
  fontWeight: 600,
  mt: 1,
} as const;

const ERROR_SX = {
  color: "error.main",
  fontSize: 12,
  ml: 5.5,
  mt: -0.5,
} as const;

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
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Notifications
      </Typography>

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={settings.osNotificationsEnabled}
              onChange={(_, checked) =>
                updateNotificationSettings({
                  osNotificationsEnabled: checked,
                })
              }
            />
          }
          label="OS notifications"
        />
        <Typography sx={DESC_SX}>
          Show desktop notifications when a terminal signals activity.
        </Typography>
      </Box>

      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={settings.soundEnabled}
              onChange={(_, checked) =>
                updateNotificationSettings({ soundEnabled: checked })
              }
            />
          }
          label="Play sound"
        />
        <Typography sx={DESC_SX}>
          Play a tone when a notification fires.
        </Typography>
      </Box>

      <Typography variant="subtitle2" sx={SUBHEAD_SX}>
        Hooks
      </Typography>

      {agentProviders.map((p) => (
        <Box key={p.name}>
          <FormControlLabel
            control={
              <Switch
                checked={!!settings.agentHooks[p.name]}
                disabled={!!pending[p.name]}
                onChange={(_, checked) => toggleAgentHooks(p.name, checked)}
              />
            }
            label={p.name}
          />
          <Typography sx={DESC_SX}>
            Install hooks in <code>~/{p.settingsPath}</code> so {p.name} emits
            notifications to this terminal.
          </Typography>
          {errors[p.name] && (
            <Typography sx={ERROR_SX}>{errors[p.name]}</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}
