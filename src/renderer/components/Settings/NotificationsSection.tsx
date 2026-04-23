import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { updateNotificationSettings, useWorkspaceStore } from "../../store";

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

export function NotificationsSection() {
  const settings = useWorkspaceStore((s) => s.notificationSettings);

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
    </Box>
  );
}
