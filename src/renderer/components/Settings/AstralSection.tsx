import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { WslDistro } from "../../../shared/types";
import { loadAppConfig } from "../../app/config-loader";
import {
  setWslDistro,
  updateUpdateSettings,
  useSettingsStore,
} from "../../settings-window/store";
import {
  DIVIDER_SX,
  FIELD_LABEL_SX,
  LabeledSelect,
  ROOT_SX,
  SettingRow,
  SUBHEAD_SX,
} from "./shared";

const HELP_SX = {
  color: "text.secondary",
  fontSize: 12,
} as const;

const SWITCH_SX = { ml: -1 } as const;

const SYSTEM_DISTRO_SX = { color: "text.disabled" } as const;

const DEFAULT_VALUE = "__default__";

const UPDATES_DESCRIPTION =
  "Download new versions in the background and install automatically " +
  "on the next launch.";

const UNSUPPORTED_DESCRIPTION = "These settings only apply on Windows.";

export function AstralSection() {
  const wslDistro = useSettingsStore((s) => s.terminalSettings.wslDistro);
  const autoEnabled = useSettingsStore((s) => s.updateSettings.autoEnabled);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [distros, setDistros] = useState<WslDistro[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAppConfig().then((config) => {
      if (cancelled) return;
      setSupported(config.platform.isWindows);
      if (!config.platform.isWindows) {
        setDistros([]);
        return;
      }
      window.app
        .listWslDistros()
        .then((list) => {
          if (cancelled) return;
          setDistros(list);
        })
        .catch((err) => {
          console.error("listWslDistros failed:", err);
          if (cancelled) return;
          setDistros([]);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (supported === false) {
    return (
      <Box sx={ROOT_SX}>
        <Typography sx={HELP_SX}>{UNSUPPORTED_DESCRIPTION}</Typography>
      </Box>
    );
  }

  if (supported === null || distros === null) {
    return <Box sx={ROOT_SX} />;
  }

  const defaultDistro = distros.find((d) => d.isDefault);
  const defaultLabel = defaultDistro
    ? `Default (${defaultDistro.name})`
    : "Default";

  const options = [
    { value: DEFAULT_VALUE, label: defaultLabel },
    ...distros.map((d) => ({
      value: d.name,
      label: d.isSystem ? (
        <Box component="span" sx={SYSTEM_DISTRO_SX}>
          {d.name}
        </Box>
      ) : (
        d.name
      ),
    })),
  ];

  const selected =
    wslDistro && distros.some((d) => d.name === wslDistro)
      ? wslDistro
      : DEFAULT_VALUE;

  const effectiveDistro = distros.find((d) =>
    wslDistro ? d.name === wslDistro : d.isDefault,
  );
  const showSystemWarning = effectiveDistro?.isSystem ?? false;

  return (
    <Box sx={ROOT_SX}>
      <Typography variant="subtitle1" sx={SUBHEAD_SX}>
        Shell
      </Typography>

      <LabeledSelect
        label="WSL distro"
        value={selected}
        options={options}
        onChange={(value) =>
          setWslDistro(value === DEFAULT_VALUE ? null : value)
        }
        maxWidth={320}
        error={showSystemWarning}
      />
      {distros.length === 0 ? (
        <Typography sx={HELP_SX}>
          No WSL distros detected. Install one with{" "}
          <code>wsl --install -d Ubuntu</code> from PowerShell.
        </Typography>
      ) : (
        <Typography sx={FIELD_LABEL_SX}>
          New terminals open in this distro. Existing terminals keep their
          current shell.
        </Typography>
      )}

      <Divider sx={DIVIDER_SX} />

      <Typography variant="subtitle1" sx={SUBHEAD_SX}>
        Updates
      </Typography>

      <SettingRow
        title="Automatic updates"
        description={UPDATES_DESCRIPTION}
        control={
          <Switch
            size="small"
            sx={SWITCH_SX}
            checked={autoEnabled}
            onChange={(_, checked) =>
              updateUpdateSettings({ autoEnabled: checked })
            }
          />
        }
      />

      {showSystemWarning && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ textWrap: "balance", alignItems: "center", mt: "auto" }}
        >
          {effectiveDistro?.name} is a system distro for containers and is not
          meant as an interactive shell.
        </Alert>
      )}
    </Box>
  );
}
