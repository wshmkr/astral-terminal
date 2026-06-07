import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { shortcutForCommand } from "../../shared/keybindings/format";
import type { CommandId } from "../../shared/keybindings/types";

const SHORTCUT_SX = { ml: 1, opacity: 0.6 } as const;

export function commandShortcut(command: CommandId): string | null {
  return shortcutForCommand(command, window.app.platform.isMac);
}

// For MUI Tooltip surfaces: shortcut rendered as a dimmed span after the label
export function commandTooltip(label: string, command: CommandId): ReactNode {
  const hint = commandShortcut(command);
  if (!hint) return label;
  return (
    <>
      {label}
      <Box component="span" sx={SHORTCUT_SX}>
        {hint}
      </Box>
    </>
  );
}

// For native HTML title attributes (browser toolbar, which must paint over the
// BrowserView overlay): plain string only, no dimming possible
export function commandTitle(label: string, command: CommandId): string {
  const hint = commandShortcut(command);
  return hint ? `${label} (${hint})` : label;
}
