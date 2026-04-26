import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { isTerminalSurface, type Workspace } from "../../../shared/types";
import {
  setActiveSurface,
  setActiveWorkspace,
  setFocusedPane,
  unreadSurfaceIds,
} from "../../store";
import { forEachLeaf } from "../Layout/pane-tree";

const SURFACE_CAPTION_BASE_SX = {
  fontSize: "0.675rem",
  cursor: "pointer",
} as const;

const SURFACE_CAPTION_DIM_SX = {
  ...SURFACE_CAPTION_BASE_SX,
  opacity: 0.7,
  color: "text.disabled",
  "&:hover": { color: "text.primary" },
} as const;

const SURFACE_CAPTION_UNREAD_SX = {
  ...SURFACE_CAPTION_BASE_SX,
  opacity: 1,
  color: "primary.main",
  "&:hover": { color: "primary.light" },
} as const;

const EMPTY_PLACEHOLDER_SX = { fontSize: "0.675rem", opacity: 0.7 } as const;
const NBSP = " ";

function stripUserHostPrefix(name: string): string {
  return name.replace(/^\S+@\S+:\s*/, "");
}

interface Props {
  workspace: Workspace;
}

export function WorkspaceSurfaceList({ workspace }: Props) {
  const surfaces = useMemo(() => {
    const out: Array<{ id: string; paneId: string; name: string }> = [];
    forEachLeaf(workspace.layout, (leaf) => {
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
  }, [workspace.layout]);

  const unreadIds = useMemo(
    () => unreadSurfaceIds(workspace.notifications),
    [workspace.notifications],
  );

  if (surfaces.length === 0) {
    return (
      <Typography
        variant="caption"
        color="text.disabled"
        noWrap
        sx={EMPTY_PLACEHOLDER_SX}
      >
        {NBSP}
      </Typography>
    );
  }

  return (
    <>
      {surfaces.map(({ id, paneId, name }) => (
        <Typography
          key={id}
          variant="caption"
          noWrap
          onClick={(e) => {
            e.stopPropagation();
            setActiveWorkspace(workspace.id);
            setActiveSurface(paneId, id);
            setFocusedPane(paneId);
          }}
          sx={
            unreadIds.has(id)
              ? SURFACE_CAPTION_UNREAD_SX
              : SURFACE_CAPTION_DIM_SX
          }
        >
          {name}
        </Typography>
      ))}
    </>
  );
}
