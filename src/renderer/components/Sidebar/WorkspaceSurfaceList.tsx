import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { isTerminalSurface, type Workspace } from "../../../shared/types";
import { forEachLeaf } from "../Layout/pane-tree";

const SURFACE_CAPTION_SX = { fontSize: "0.675rem", opacity: 0.7 } as const;
const BRANCH_SX = { ml: 0.75, opacity: 0.6 } as const;
const NBSP = " ";

function stripUserHostPrefix(name: string): string {
  return name.replace(/^\S+@\S+:\s*/, "");
}

interface SurfaceEntry {
  id: string;
  name: string;
  branch?: string;
}

interface Props {
  layout: Workspace["layout"];
}

export function WorkspaceSurfaceList({ layout }: Props) {
  const surfaces = useMemo<SurfaceEntry[]>(() => {
    const out: SurfaceEntry[] = [];
    forEachLeaf(layout, (leaf) => {
      for (const s of leaf.surfaces) {
        if (isTerminalSurface(s))
          out.push({
            id: s.id,
            name: stripUserHostPrefix(s.name),
            branch: s.branch,
          });
      }
    });
    return out;
  }, [layout]);

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
      {surfaces.map(({ id, name, branch }) => (
        <Typography
          key={id}
          variant="caption"
          color="text.disabled"
          noWrap
          sx={SURFACE_CAPTION_SX}
        >
          {name}
          {branch && (
            <Box component="span" sx={BRANCH_SX}>
              {branch}
            </Box>
          )}
        </Typography>
      ))}
    </>
  );
}
