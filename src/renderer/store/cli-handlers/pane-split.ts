import { z } from "zod";
import type { SplitDirection } from "../../../shared/types";
import {
  CliHandlerError,
  parseCliParams,
  registerCliHandler,
} from "../cli-bridge";
import { getWorkspaceFocusedPaneId, splitPane } from "../workspaces";
import { resolveTarget, TargetParamsSchema } from "./target";

// "right" grows side by side (vertical divider); "down" stacks (horizontal divider).
const DIRECTION_MAP = {
  right: "vertical",
  down: "horizontal",
} as const satisfies Record<string, SplitDirection>;

const SplitParamsSchema = TargetParamsSchema.extend({
  direction: z.enum(["right", "down"], {
    error: "must be one of: right, down",
  }),
});

registerCliHandler("pane.split", (params) => {
  const { direction, ...target } = parseCliParams(SplitParamsSchema, params);
  const { workspaceId, paneId } = resolveTarget(target, "pane");
  const focusNew = paneId === getWorkspaceFocusedPaneId(workspaceId);
  const created = splitPane(paneId, DIRECTION_MAP[direction], {
    workspaceId,
    focusNew,
  });
  if (!created) {
    throw new CliHandlerError("internal_error", "split did not produce a pane");
  }
  return { workspaceId, paneId: created.paneId, surfaceId: created.surfaceId };
});
