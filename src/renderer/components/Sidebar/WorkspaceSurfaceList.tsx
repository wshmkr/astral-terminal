import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { isTerminalSurface, type Workspace } from "../../../shared/types";
import { forEachLeaf } from "../Layout/pane-tree";

const SURFACE_CAPTION_SX = { fontSize: "0.675rem", opacity: 0.7 } as const;
const NBSP = " ";

function stripUserHostPrefix(name: string): string {
  return name.replace(/^\S+@\S+:\s*/, "");
}

interface Props {
  layout: Workspace["layout"];
}

export function WorkspaceSurfaceList({ layout }: Props) {
  const surfaces = useMemo(() => {
    const out: Array<{ id: string; name: string }> = [];
    forEachLeaf(layout, (leaf) => {
      for (const s of leaf.surfaces) {
        if (isTerminalSurface(s))
          out.push({ id: s.id, name: stripUserHostPrefix(s.name) });
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
      {surfaces.map(({ id, name }) => (
        <Typography
          key={id}
          variant="caption"
          color="text.disabled"
          noWrap
          sx={SURFACE_CAPTION_SX}
        >
          {name}
        </Typography>
      ))}
    </>
  );
}
