import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import {
  isTerminalSurface,
  type Notification,
  type Workspace,
} from "../../../shared/types";
import {
  setActiveSurface,
  setActiveWorkspace,
  setFocusedPane,
} from "../../store";
import { forEachLeaf } from "../Layout/pane-tree";

const SURFACE_CAPTION_SX = { fontSize: "0.675rem", opacity: 0.7 } as const;

const SURFACE_CAPTION_INTERACTIVE_SX = {
  ...SURFACE_CAPTION_SX,
  cursor: "pointer",
  "&:hover": { color: "text.primary" },
} as const;

const SURFACE_CAPTION_UNREAD_SX = {
  ...SURFACE_CAPTION_INTERACTIVE_SX,
  opacity: 1,
  color: "primary.main",
  "&:hover": { color: "primary.light" },
} as const;

const NBSP = " ";

function stripUserHostPrefix(name: string): string {
  return name.replace(/^\S+@\S+:\s*/, "");
}

interface Props {
  workspaceId: string;
  layout: Workspace["layout"];
  notifications: Notification[];
}

export function WorkspaceSurfaceList({
  workspaceId,
  layout,
  notifications,
}: Props) {
  const surfaces = useMemo(() => {
    const out: Array<{ id: string; paneId: string; name: string }> = [];
    forEachLeaf(layout, (leaf) => {
      for (const s of leaf.surfaces) {
        if (isTerminalSurface(s))
          out.push({
            id: s.id,
            paneId: leaf.id,
            name: stripUserHostPrefix(s.name),
          });
      }
    });
    return out;
  }, [layout]);

  const unreadSurfaceIds = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => {
      if (!n.read) set.add(n.surfaceId);
    });
    return set;
  }, [notifications]);

  if (surfaces.length === 0) {
    return (
      <Typography
        variant="caption"
        color="text.disabled"
        noWrap
        sx={SURFACE_CAPTION_SX}
      >
        {NBSP}
      </Typography>
    );
  }

  return (
    <>
      {surfaces.map(({ id, paneId, name }) => {
        const hasUnread = unreadSurfaceIds.has(id);
        return (
          <Typography
            key={id}
            variant="caption"
            color={hasUnread ? undefined : "text.disabled"}
            noWrap
            onClick={(e) => {
              e.stopPropagation();
              setActiveWorkspace(workspaceId);
              setActiveSurface(paneId, id);
              setFocusedPane(paneId);
            }}
            sx={
              hasUnread
                ? SURFACE_CAPTION_UNREAD_SX
                : SURFACE_CAPTION_INTERACTIVE_SX
            }
          >
            {name}
          </Typography>
        );
      })}
    </>
  );
}
