import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { UpdateStatus, WslDistro } from "../../../shared/types";
import { loadAppConfig } from "../../app/config-loader";
import {
  setWslDistro,
  updateUpdateSettings,
  useSettingsStore,
} from "../../settings-window/store";
import { formatRelativeTime } from "../../utils/format-time";
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

const STATUS_ROW_SX = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  mt: 1,
} as const;

const STATUS_STACK_SX = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 0.25,
} as const;

const STATUS_TEXT_SX = { fontWeight: 500 } as const;
const STATUS_SUB_SX = { color: "text.secondary", fontSize: 12 } as const;

function statusLabel(status: UpdateStatus): string {
  switch (status.state) {
    case "idle":
      return "Not checked yet";
    case "checking":
      return "Checking for updates…";
    case "not-available":
      return "Astral is up to date";
    case "downloading":
      return "Downloading update…";
    case "downloaded":
      return status.downloadedVersion
        ? `Update ready: ${status.downloadedVersion}`
        : "Update ready";
    case "error":
      return "Couldn't check for updates";
  }
}

function ActionButton({ status }: { status: UpdateStatus }) {
  if (status.state === "downloaded") {
    return (
      <Button
        size="small"
        variant="contained"
        onClick={() => {
          window.app.installUpdate().catch((err) => {
            console.error("Install update failed:", err);
          });
        }}
      >
        Restart & install
      </Button>
    );
  }
  const busy = status.state === "checking" || status.state === "downloading";
  return (
    <Button
      size="small"
      variant="outlined"
      disabled={busy}
      onClick={() => {
        window.app.requestUpdateCheck().catch((err) => {
          console.error("Update check failed:", err);
        });
      }}
    >
      {busy ? "Checking…" : "Check now"}
    </Button>
  );
}

function UpdateStatusRow({ status }: { status: UpdateStatus }) {
  const subLine =
    status.lastCheckedAt !== null
      ? `Last checked: ${formatRelativeTime(status.lastCheckedAt)}`
      : null;
  const label = (
    <Typography variant="body2" sx={STATUS_TEXT_SX}>
      {statusLabel(status)}
    </Typography>
  );
  return (
    <Box sx={STATUS_ROW_SX}>
      <Box sx={STATUS_STACK_SX}>
        {status.state === "error" && status.errorMessage ? (
          <Tooltip title={status.errorMessage} placement="top">
            {label}
          </Tooltip>
        ) : (
          label
        )}
        {subLine && <Typography sx={STATUS_SUB_SX}>{subLine}</Typography>}
      </Box>
      <ActionButton status={status} />
    </Box>
  );
}

export function AstralSection() {
  const wslDistro = useSettingsStore((s) => s.terminalSettings.wslDistro);
  const autoEnabled = useSettingsStore((s) => s.updateSettings.autoEnabled);
  const updateStatus = useSettingsStore((s) => s.updateStatus);
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

      <UpdateStatusRow status={updateStatus} />

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
