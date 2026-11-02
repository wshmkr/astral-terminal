import { z } from "zod";
import {
  PANE_SPLIT_DIRECTIONS,
  type PaneSplitDirection,
  type PaneSplitParams,
  type PaneSplitResult,
} from "../../../shared/cli/pane";
import type { SplitDirection } from "../../../shared/types";
import {
  CliHandlerError,
  parseCliParams,
  registerCliHandler,
} from "../cli-bridge";
import {
  getWorkspaceFocusedPaneId,
  setActiveWorkspace,
  splitPane,
} from "../workspaces";
import { resolveTarget, TargetParamsSchema } from "./target";

// "left"/"right" grow side by side (vertical divider); "up"/"down" stack (horizontal divider).
const DIRECTION_MAP = {
  left: { split: "vertical", before: true },
  right: { split: "vertical", before: false },
  up: { split: "horizontal", before: true },
  down: { split: "horizontal", before: false },
} as const satisfies Record<
  PaneSplitDirection,
  { split: SplitDirection; before: boolean }
>;

const SplitParamsSchema = TargetParamsSchema.extend({
  direction: z.enum(PANE_SPLIT_DIRECTIONS, {
    error: `must be one of: ${PANE_SPLIT_DIRECTIONS.join(", ")}`,
  }),
  browser: z.boolean().optional(),
  url: z.string().min(1).optional(),
  focus: z.boolean().optional(),
}).refine((p) => p.url === undefined || p.browser === true, {
  error: "requires browser",
  path: ["url"],
}) satisfies z.ZodType<PaneSplitParams>;

registerCliHandler("pane.split", (params): PaneSplitResult => {
  const { direction, browser, url, focus, ...target } = parseCliParams(
    SplitParamsSchema,
    params,
  );
  const { workspaceId, paneId } = resolveTarget(target, "pane");
  const { split, before } = DIRECTION_MAP[direction];
  const created = splitPane(paneId, split, {
    workspaceId,
    focusNew:
      focus === true || paneId === getWorkspaceFocusedPaneId(workspaceId),
    before,
    kind: browser ? "browser" : "terminal",
    url,
  });
  if (!created) {
    throw new CliHandlerError("internal_error", "split did not produce a pane");
  }
  if (focus) setActiveWorkspace(workspaceId);
  return { workspaceId, paneId: created.paneId, surfaceId: created.surfaceId };
});
