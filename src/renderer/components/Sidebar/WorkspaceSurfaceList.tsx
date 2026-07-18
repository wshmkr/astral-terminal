import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo, useMemo } from "react";
import {
  isTerminalSurface,
  type PaneStatus,
  surfaceSidebarLabel,
  type Workspace,
} from "../../../shared/types";
import {
  setActiveSurface,
  setActiveWorkspace,
  unreadSurfaceIds,
} from "../../store";
import { forEachLeaf } from "../Layout/pane-tree";

const STATUS_LABEL: Record<PaneStatus, string> = {
  "needs-input": "Needs input",
  "ready-for-review": "Ready for review",
  completed: "Completed",
};

const STATUS_TAG_BASE_SX = {
  fontSize: "0.6rem",
  fontWeight: 600,
  lineHeight: 1,
  flexShrink: 0,
  whiteSpace: "nowrap",
} as const;

const STATUS_COLOR: Record<PaneStatus, string> = {
  "needs-input": "warning.main",
  "ready-for-review": "primary.main",
  completed: "success.main",
};

const SURFACE_CAPTION_BASE_SX = {
  fontSize: "0.675rem",
  // Allow the name to shrink below content width so noWrap can ellipsize it
  // instead of overflowing past the status tag.
  minWidth: 0,
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
const ROW_CONTAINER_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  minWidth: 0,
  cursor: "pointer",
} as const;
const NBSP = " ";

interface SurfaceRowProps {
  workspaceId: string;
  paneId: string;
  surfaceId: string;
  name: string;
  status: PaneStatus | undefined;
  unread: boolean;
}

// Memoized so a status flip on one row doesn't re-render every sibling.
const SurfaceRow = memo(function SurfaceRow({
  workspaceId,
  paneId,
  surfaceId,
  name,
  status,
  unread,
}: SurfaceRowProps) {
  return (
    <Box
      sx={ROW_CONTAINER_SX}
      onClick={(e) => {
        e.stopPropagation();
        setActiveWorkspace(workspaceId);
        setActiveSurface(paneId, surfaceId);
      }}
    >
      <Typography
        variant="caption"
        noWrap
        sx={unread ? SURFACE_CAPTION_UNREAD_SX : SURFACE_CAPTION_DIM_SX}
      >
        {name}
      </Typography>
      {status && (
        <Typography
          component="span"
          variant="caption"
          sx={{ ...STATUS_TAG_BASE_SX, color: STATUS_COLOR[status] }}
        >
          {STATUS_LABEL[status]}
        </Typography>
      )}
    </Box>
  );
});

interface Props {
  workspace: Workspace;
}

export function WorkspaceSurfaceList({ workspace }: Props) {
  const surfaces = useMemo(() => {
    const out: Array<{
      id: string;
      paneId: string;
      name: string;
      status?: PaneStatus;
    }> = [];
    forEachLeaf(workspace.layout, (leaf) => {
      for (const s of leaf.surfaces) {
        out.push({
          id: s.id,
          paneId: leaf.id,
          name: surfaceSidebarLabel(s),
          status: isTerminalSurface(s) ? s.status : undefined,
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
      {surfaces.map(({ id, paneId, name, status }) => (
        <SurfaceRow
          key={id}
          workspaceId={workspace.id}
          paneId={paneId}
          surfaceId={id}
          name={name}
          status={status}
          unread={unreadIds.has(id)}
        />
      ))}
    </>
  );
}
