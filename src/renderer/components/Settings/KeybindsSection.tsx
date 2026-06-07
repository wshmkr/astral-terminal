import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { Fragment } from "react";
import type { CommandId } from "../../../shared/keybindings/types";
import { commandShortcut } from "../../keybindings/shortcutHint";
import { DIVIDER_SX, ROOT_SX, SUBHEAD_SX } from "./shared";

interface KeybindRow {
  label: string;
  command: CommandId;
}

interface KeybindGroup {
  id: "general" | "workspaces" | "view" | "terminal" | "browser";
  title: string;
  rows: ReadonlyArray<KeybindRow>;
}

const GROUPS: ReadonlyArray<KeybindGroup> = [
  {
    id: "general",
    title: "General (Panes & Tabs)",
    rows: [
      { label: "Split right", command: "pane.splitRight" },
      { label: "Split down", command: "pane.splitDown" },
      { label: "Close pane", command: "pane.close" },
      { label: "New terminal tab", command: "tab.new" },
      { label: "New browser tab", command: "tab.newBrowser" },
      { label: "Close tab", command: "tab.close" },
      { label: "Next tab", command: "tab.next" },
      { label: "Previous tab", command: "tab.prev" },
    ],
  },
  {
    id: "workspaces",
    title: "Workspaces",
    rows: [
      { label: "New workspace", command: "workspace.new" },
      { label: "Next workspace", command: "workspace.next" },
      { label: "Previous workspace", command: "workspace.prev" },
    ],
  },
  {
    id: "view",
    title: "View",
    rows: [
      { label: "Zoom in", command: "ui.zoomIn" },
      { label: "Zoom out", command: "ui.zoomOut" },
      { label: "Reset zoom", command: "ui.zoomReset" },
      { label: "Open settings", command: "app.openSettings" },
    ],
  },
  {
    id: "terminal",
    title: "Terminal",
    rows: [
      { label: "Copy", command: "terminal.copy" },
      { label: "Paste", command: "terminal.paste" },
      { label: "Find", command: "terminal.find" },
    ],
  },
  {
    id: "browser",
    title: "Browser",
    rows: [
      { label: "Back", command: "browser.back" },
      { label: "Forward", command: "browser.forward" },
      { label: "Reload", command: "browser.reload" },
      { label: "Focus address bar", command: "browser.focusAddressBar" },
      { label: "DevTools", command: "browser.devtools" },
      { label: "Find", command: "browser.find" },
    ],
  },
];

const ROW_SX = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2,
} as const;

const LABEL_SX = { fontSize: 13 } as const;

const KEYCAP_SX = {
  fontFamily: "monospace",
  fontSize: 12,
  color: "text.secondary",
  bgcolor: "action.hover",
  border: 1,
  borderColor: "custom.subtleDivider",
  borderRadius: 1,
  px: 0.75,
  py: 0.25,
  whiteSpace: "nowrap",
} as const;

function KeybindLine({ label, combo }: { label: string; combo: string }) {
  return (
    <Box sx={ROW_SX}>
      <Typography variant="body2" sx={LABEL_SX}>
        {label}
      </Typography>
      <Box sx={KEYCAP_SX}>{combo}</Box>
    </Box>
  );
}

export function KeybindsSection() {
  // Collapse the nine workspace.select.* bindings into one range row
  const workspaceFirst = commandShortcut("workspace.select.1");
  const workspaceNinth = commandShortcut("workspace.select.9");
  const workspaceRange =
    workspaceFirst && workspaceNinth
      ? `${workspaceFirst} … ${workspaceNinth}`
      : null;

  return (
    <Box sx={ROOT_SX}>
      {GROUPS.map((group, index) => (
        <Fragment key={group.id}>
          {index > 0 && <Divider sx={DIVIDER_SX} />}
          <Typography variant="subtitle1" sx={SUBHEAD_SX}>
            {group.title}
          </Typography>
          {group.rows.map((row) => {
            const combo = commandShortcut(row.command);
            if (!combo) return null;
            return (
              <KeybindLine key={row.command} label={row.label} combo={combo} />
            );
          })}
          {group.id === "workspaces" && workspaceRange && (
            <KeybindLine
              label="Switch to workspace 1–9"
              combo={workspaceRange}
            />
          )}
        </Fragment>
      ))}
    </Box>
  );
}
