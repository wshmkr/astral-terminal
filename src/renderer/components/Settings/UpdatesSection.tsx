import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import { useEffect, useState } from "react";
import { loadAppConfig } from "../../app/config-loader";
import { ROOT_SX, SettingRow } from "./shared";

const SWITCH_SX = { ml: -1 } as const;

const DESCRIPTION =
  "Download new versions in the background. The update is applied " +
  "automatically the next time you launch Astral. Changes to this " +
  "setting take effect on next launch.";

const UNSUPPORTED_DESCRIPTION =
  "Automatic updates are only available on Windows.";

export function UpdatesSection() {
  const [enabled, setEnabled] = useState(true);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    window.app.getAutoUpdatesEnabled().then(setEnabled);
    loadAppConfig().then((config) => setSupported(config.platform.isWindows));
  }, []);

  const onChange = (checked: boolean) => {
    setEnabled(checked);
    window.app.setAutoUpdatesEnabled(checked);
  };

  return (
    <Box sx={ROOT_SX}>
      <SettingRow
        title="Automatic updates"
        description={supported ? DESCRIPTION : UNSUPPORTED_DESCRIPTION}
        control={
          <Switch
            size="small"
            sx={SWITCH_SX}
            checked={supported && enabled}
            disabled={!supported}
            onChange={(_, checked) => onChange(checked)}
          />
        }
      />
    </Box>
  );
}
