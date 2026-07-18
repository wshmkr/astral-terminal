import Box from "@mui/material/Box";
import type { WslDistro } from "../../../shared/types";
import type { LabeledSelectOption } from "./shared";

// Shared between the Settings Astral section and the Welcome dialog so the
// option shape, default sentinel, and system-distro copy can't drift.

export const DEFAULT_DISTRO_VALUE = "__default__";

const SYSTEM_DISTRO_SX = { color: "text.disabled" } as const;

export function wslDistroOptions(
  distros: WslDistro[],
): LabeledSelectOption<string>[] {
  const defaultDistro = distros.find((d) => d.isDefault);
  return [
    {
      value: DEFAULT_DISTRO_VALUE,
      label: defaultDistro ? `Default (${defaultDistro.name})` : "Default",
    },
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
}

// The distro a new terminal would actually use for the given selection
// (null selection = the WSL default).
export function findEffectiveDistro(
  distros: WslDistro[],
  selected: string | null,
): WslDistro | undefined {
  return distros.find((d) => (selected ? d.name === selected : d.isDefault));
}

export function systemDistroWarning(name: string | undefined): string {
  return `${name} is a system distro for containers and is not meant as an interactive shell.`;
}
