import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { memo, useState } from "react";
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
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  p: "1px",
  borderRadius: 0.5,
  color: "text.disabled",
  opacity: 0,
  pointerEvents: "none",
  "&:hover": { bgcolor: "error.main", color: "common.white" },
  "&.Mui-focusVisible": { bgcolor: "error.main", color: "common.white" },
} as const;

const TITLE_ROW_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.75,
} as const;

function nameTypographySx(isActive: boolean) {
  return {
    minWidth: 0,
    fontWeight: 500,
    color: isActive ? "text.primary" : "text.secondary",
  } as const;
}

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
    "&:hover .ws-close, &:focus-within .ws-close": {
      opacity: 1,
      pointerEvents: "auto",
    },
    "&:hover .ws-edit": { display: "inline-flex" },
    "&:hover .ws-title-row, &:focus-within .ws-title-row": { pr: "22px" },
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

export const WorkspaceTab = memo(function WorkspaceTab({
  workspace,
  isActive,
  showDivider,
}: Props) {
  const [editing, setEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: workspace.id,
    data: { type: "workspace" },
    disabled: editing,
  });

  return (
    <Box
      ref={setNodeRef}
      className="workspace-tab"
      onClick={() => setActiveWorkspace(workspace.id)}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
      sx={rootSx(isActive, showDivider)}
      {...attributes}
      {...listeners}
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
            sx={nameTypographySx(isActive)}
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
        <ButtonBase
          disableRipple
          aria-label="Close workspace"
          className="ws-close"
          onClick={(e) => {
            e.stopPropagation();
            closeWorkspace(workspace.id);
          }}
          sx={CLOSE_AFFORDANCE_SX}
        >
          <VscClose size={16} />
        </ButtonBase>
      )}
      <WorkspaceSurfaceList workspace={workspace} />
    </Box>
  );
});
