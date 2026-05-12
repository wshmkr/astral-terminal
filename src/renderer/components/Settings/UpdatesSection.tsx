import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import { useEffect, useState } from "react";
import { ROOT_SX, SettingRow } from "./shared";

const SWITCH_SX = { ml: -1 } as const;

const DESCRIPTION =
  "Download new versions in the background. The update is applied " +
  "automatically the next time you launch Astral. Changes to this " +
  "setting take effect on next launch.";

export function UpdatesSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    window.app.getAutoUpdatesEnabled().then(setEnabled);
  }, []);

  const onChange = (checked: boolean) => {
    setEnabled(checked);
    window.app.setAutoUpdatesEnabled(checked);
  };

  return (
    <Box sx={ROOT_SX}>
      <SettingRow
        title="Automatic updates"
        description={DESCRIPTION}
        control={
          <Switch
            size="small"
            sx={SWITCH_SX}
            checked={enabled ?? true}
            disabled={enabled === null}
            onChange={(_, checked) => onChange(checked)}
          />
        }
      />
    </Box>
  );
}
