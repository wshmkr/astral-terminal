import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { VscClose, VscEdit } from "react-icons/vsc";
import type { Workspace } from "../../../shared/types";
import {
  closeWorkspace,
  renameWorkspace,
  setActiveWorkspace,
  unreadCount,
} from "../../store";
import { WorkspaceRenameInput } from "./WorkspaceRenameInput";
import { WorkspaceSurfaceList } from "./WorkspaceSurfaceList";

const MAX_NAME_LEN = 64;

const EDIT_AFFORDANCE_SX = {
  display: "none",
  alignItems: "center",
  cursor: "pointer",
  color: "text.disabled",
  flexShrink: 0,
  p: 0,
  borderRadius: 0.5,
  "&:hover": { color: "text.primary" },
} as const;

const CLOSE_AFFORDANCE_SX = {
  position: "absolute",
  top: "22px",
  right: "10px",
  transform: "translateY(-50%)",
  display: "none",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  p: "1px",
  borderRadius: 0.5,
  color: "text.disabled",
  "&:hover": { bgcolor: "error.main", color: "common.white" },
} as const;

const TITLE_ROW_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.75,
} as const;

const NAME_TYPOGRAPHY_SX = {
  minWidth: 0,
  fontWeight: 500,
  color: "text.primary",
} as const;

const UNREAD_DOT_SX = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  bgcolor: "primary.main",
  flexShrink: 0,
} as const;

function rootSx(isActive: boolean, showDivider: boolean) {
  return {
    display: "flex",
    flexDirection: "column",
    p: "12px 16px",
    minHeight: 36,
    minWidth: 100,
    cursor: "pointer",
    position: "relative",
    userSelect: "none",
    bgcolor: isActive ? "action.selected" : "transparent",
    "&:hover": { bgcolor: isActive ? "action.selected" : "action.hover" },
    "&:hover .ws-close": { display: "inline-flex" },
    "&:hover .ws-edit": { display: "inline-flex" },
    "&:hover .ws-title-row": { pr: "22px" },
    "&::after": showDivider
      ? {
          content: '""',
          position: "absolute",
          left: "5%",
          right: "5%",
          bottom: -1,
          height: "1px",
          backgroundColor: "custom.subtleDivider",
          transition: "opacity 0.15s",
        }
      : {},
    "&:hover::after": { opacity: 0 },
    "&:has(+ .workspace-tab:hover)::after": { opacity: 0 },
  } as const;
}

interface Props {
  workspace: Workspace;
  isActive: boolean;
  showDivider: boolean;
}

export function WorkspaceTab({ workspace, isActive, showDivider }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <Box
      className="workspace-tab"
      onClick={() => setActiveWorkspace(workspace.id)}
      sx={rootSx(isActive, showDivider)}
    >
      <Box className="ws-title-row" sx={TITLE_ROW_SX}>
        {unreadCount(workspace) > 0 && <Box sx={UNREAD_DOT_SX} />}
        {editing ? (
          <WorkspaceRenameInput
            initialName={workspace.name}
            maxLength={MAX_NAME_LEN}
            onCommit={(next) => {
              if (next && next !== workspace.name)
                renameWorkspace(workspace.id, next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <Typography
            variant="body2"
            noWrap
            title={workspace.name}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            sx={NAME_TYPOGRAPHY_SX}
          >
            {workspace.name}
          </Typography>
        )}
        {!editing && (
          <Box
            component="span"
            className="ws-edit"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            sx={EDIT_AFFORDANCE_SX}
          >
            <VscEdit size={12} />
          </Box>
        )}
      </Box>
      {!editing && (
        <Box
          component="span"
          className="ws-close"
          onClick={(e) => {
            e.stopPropagation();
            closeWorkspace(workspace.id);
          }}
          sx={CLOSE_AFFORDANCE_SX}
        >
          <VscClose size={16} />
        </Box>
      )}
      <WorkspaceSurfaceList layout={workspace.layout} />
    </Box>
  );
}
