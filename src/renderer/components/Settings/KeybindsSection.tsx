import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { VscChevronDown, VscChevronRight } from "react-icons/vsc";
import type { CommandId } from "../../../shared/keybindings/types";
import { commandShortcut } from "../../keybindings/shortcutHint";
import { ROOT_SX, SUBHEAD_SX } from "./shared";

interface KeybindRow {
  label: string;
  command: CommandId;
}

interface KeybindGroup {
  id: "terminals" | "workspaces" | "app" | "browser";
  title: string;
  rows: ReadonlyArray<KeybindRow>;
}

const GROUPS: ReadonlyArray<KeybindGroup> = [
  {
    id: "terminals",
    title: "Terminals",
    rows: [
      { label: "Split right", command: "pane.splitRight" },
      { label: "Split down", command: "pane.splitDown" },
      { label: "Close pane", command: "pane.close" },
      { label: "New terminal tab", command: "tab.new" },
      { label: "New browser tab", command: "tab.newBrowser" },
      { label: "Close tab", command: "tab.close" },
      { label: "Next tab", command: "tab.next" },
      { label: "Previous tab", command: "tab.prev" },
      { label: "Copy", command: "terminal.copy" },
      { label: "Paste", command: "terminal.paste" },
      { label: "Find", command: "terminal.find" },
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
    id: "app",
    title: "App",
    rows: [
      { label: "Zoom in", command: "ui.zoomIn" },
      { label: "Zoom out", command: "ui.zoomOut" },
      { label: "Reset zoom", command: "ui.zoomReset" },
      { label: "Open settings", command: "app.openSettings" },
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

const GROUP_HEADER_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  cursor: "pointer",
  userSelect: "none",
} as const;

const CHEVRON_SX = { display: "inline-flex", color: "text.secondary" } as const;

const ROWS_SX = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 1.5,
  pt: 1,
  pb: 0.5,
  pl: 1,
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
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const workspaceFirst = commandShortcut("workspace.select.1");
  const workspaceNinth = commandShortcut("workspace.select.9");
  const workspaceRange =
    workspaceFirst && workspaceNinth
      ? `${workspaceFirst} … ${workspaceNinth}`
      : null;

  return (
    <Box sx={ROOT_SX}>
      {GROUPS.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        return (
          <Box key={group.id}>
            <Box
              sx={GROUP_HEADER_SX}
              role="button"
              tabIndex={0}
              aria-expanded={!isCollapsed}
              aria-controls={`keybind-group-${group.id}`}
              onClick={() => toggle(group.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(group.id);
                }
              }}
            >
              <Typography variant="subtitle1" sx={SUBHEAD_SX}>
                {group.title}
              </Typography>
              <Box sx={CHEVRON_SX}>
                {isCollapsed ? (
                  <VscChevronRight size={16} />
                ) : (
                  <VscChevronDown size={16} />
                )}
              </Box>
            </Box>
            <Collapse in={!isCollapsed}>
              <Box id={`keybind-group-${group.id}`} sx={ROWS_SX}>
                {group.rows.map((row) => {
                  const combo = commandShortcut(row.command);
                  if (!combo) return null;
                  return (
                    <KeybindLine
                      key={row.command}
                      label={row.label}
                      combo={combo}
                    />
                  );
                })}
                {group.id === "workspaces" && workspaceRange && (
                  <KeybindLine
                    label="Switch to workspace 1–9"
                    combo={workspaceRange}
                  />
                )}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}
