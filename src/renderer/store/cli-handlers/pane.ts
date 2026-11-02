import { z } from "zod";
import {
  PANE_MAX_SIZE_PERCENT,
  PANE_MIN_SIZE_PERCENT,
  type PaneInfo,
  type PaneListResult,
  type PaneRefResult,
  type PaneResizeParams,
  type PaneResizeResult,
} from "../../../shared/cli/pane";
import { normalizeFractions } from "../../components/Layout/layout-math";
import { forEachLeaf } from "../../components/Layout/pane-tree";
import {
  CliHandlerError,
  parseCliParams,
  registerCliHandler,
} from "../cli-bridge";
import { getWorkspace } from "../core";
import {
  closePane,
  findPaneBySurfaceId,
  findParentSplit,
  getWorkspaceFocusedPaneId,
  resizeSplit,
  setActiveWorkspace,
  setFocusedPane,
} from "../workspaces";
import { resolveTarget, TargetParamsSchema } from "./target";

const ResizeParamsSchema = TargetParamsSchema.extend({
  size: z.number().min(PANE_MIN_SIZE_PERCENT).max(PANE_MAX_SIZE_PERCENT),
}) satisfies z.ZodType<PaneResizeParams>;

// Closing the caller's pane kills the caller, so its reply has to go out first.
const CALLER_PANE_CLOSE_DELAY_MS = 100;

function withShare(sizes: number[], index: number, share: number): number[] {
  const others = 1 - (sizes[index] ?? 0);
  const remainder = 1 - share;
  const scaled = sizes.map((s, i) => {
    if (i === index) return share;
    return others > 0
      ? (s / others) * remainder
      : remainder / (sizes.length - 1);
  });
  return normalizeFractions(scaled, scaled.length);
}

registerCliHandler("pane.list", (params): PaneListResult => {
  const { workspaceId } = resolveTarget(
    parseCliParams(TargetParamsSchema, params),
    "workspace",
  );
  const workspace = getWorkspace(workspaceId);
  if (!workspace) {
    throw new CliHandlerError(
      "internal_error",
      `workspace ${workspaceId} disappeared`,
    );
  }
  const focusedPaneId = getWorkspaceFocusedPaneId(workspaceId);
  const panes: PaneInfo[] = [];
  forEachLeaf(workspace.layout, (leaf) => {
    panes.push({
      paneId: leaf.id,
      workspaceId,
      focused: leaf.id === focusedPaneId,
      activeSurfaceId: leaf.activeSurfaceId,
      tabCount: leaf.surfaces.length,
    });
  });
  return { panes };
});

registerCliHandler("pane.focus", (params): PaneRefResult => {
  const { workspaceId, paneId } = resolveTarget(
    parseCliParams(TargetParamsSchema, params),
    "pane",
  );
  setActiveWorkspace(workspaceId);
  setFocusedPane(paneId);
  return { paneId };
});

registerCliHandler("pane.close", (params): PaneRefResult => {
  const target = parseCliParams(TargetParamsSchema, params);
  const { workspaceId, paneId } = resolveTarget(target, "pane");
  const close = () => closePane(paneId, { workspaceId });
  const isCallerPane =
    target.callerSurfaceId !== undefined &&
    findPaneBySurfaceId(target.callerSurfaceId)?.paneId === paneId;
  if (isCallerPane) setTimeout(close, CALLER_PANE_CLOSE_DELAY_MS);
  else close();
  return { paneId };
});

registerCliHandler("pane.resize", (params): PaneResizeResult => {
  const { size, ...target } = parseCliParams(ResizeParamsSchema, params);
  const { workspaceId, paneId } = resolveTarget(target, "pane");
  const parent = findParentSplit(workspaceId, paneId);
  if (!parent) {
    throw new CliHandlerError(
      "invalid_params",
      `pane ${paneId} has no parent split`,
    );
  }
  const sizes = withShare(parent.sizes, parent.index, size / 100);
  resizeSplit(parent.splitId, sizes, { workspaceId });
  return { paneId, sizes };
});
