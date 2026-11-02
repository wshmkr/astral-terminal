import { z } from "zod";
import type {
  SurfaceCreateParams,
  SurfaceCreateResult,
  SurfaceInfo,
  SurfaceListParams,
  SurfaceListResult,
  SurfaceMoveParams,
  SurfaceMoveResult,
  SurfaceRefResult,
  SurfaceRenameParams,
} from "../../../shared/cli/surface";
import {
  isTerminalSurface,
  type LeafPane,
  type Surface,
} from "../../../shared/types";
import { findLeafPane, forEachLeaf } from "../../components/Layout/pane-tree";
import {
  CliHandlerError,
  parseCliParams,
  registerCliHandler,
} from "../cli-bridge";
import { getWorkspace } from "../core";
import {
  addSurface,
  closeSurface,
  consumeBrowserUrlFocus,
  moveSurfaceToPane,
  navigateToSurface,
  renameSurface,
  reorderSurfaces,
  setActiveWorkspace,
} from "../workspaces";
import { resolveTarget, TargetParamsSchema } from "./target";

const ListParamsSchema = TargetParamsSchema.omit({
  surfaceId: true,
}) satisfies z.ZodType<SurfaceListParams>;

const CreateParamsSchema = TargetParamsSchema.extend({
  browser: z.boolean().optional(),
  url: z.string().min(1).optional(),
  cwd: z.string().min(1).optional(),
  focus: z.boolean().optional(),
})
  .refine((p) => p.browser || p.url === undefined, {
    error: "requires browser",
    path: ["url"],
  })
  .refine((p) => !p.browser || p.cwd === undefined, {
    error: "does not apply to a browser",
    path: ["cwd"],
  }) satisfies z.ZodType<SurfaceCreateParams>;

const RenameParamsSchema = TargetParamsSchema.extend({
  name: z.string().trim().min(1),
}) satisfies z.ZodType<SurfaceRenameParams>;

const MoveParamsSchema = TargetParamsSchema.extend({
  toPaneId: z.string(),
  index: z.number().int().nonnegative().optional(),
}) satisfies z.ZodType<SurfaceMoveParams>;

// Closing the caller's tab kills the caller, so its reply has to go out first.
const CALLER_TAB_CLOSE_DELAY_MS = 100;

function closeTab(
  workspaceId: string,
  paneId: string,
  surfaceId: string,
  callerSurfaceId: string | undefined,
): void {
  const close = () => closeSurface(paneId, surfaceId, { workspaceId });
  if (surfaceId === callerSurfaceId) {
    setTimeout(close, CALLER_TAB_CLOSE_DELAY_MS);
  } else {
    close();
  }
}

function describeSurface(
  workspaceId: string,
  leaf: LeafPane,
  surface: Surface,
): SurfaceInfo {
  const base = {
    surfaceId: surface.id,
    paneId: leaf.id,
    workspaceId,
    type: surface.type,
    name: surface.name,
    active: leaf.activeSurfaceId === surface.id,
  };
  return isTerminalSurface(surface)
    ? { ...base, cwd: surface.cwd }
    : { ...base, url: surface.url };
}

function reorderWithinPane(
  workspaceId: string,
  paneId: string,
  surfaceId: string,
  index: number,
): void {
  const layout = getWorkspace(workspaceId)?.layout;
  const surfaces = layout ? findLeafPane(layout, paneId)?.surfaces : undefined;
  const over = surfaces?.[Math.min(index, surfaces.length - 1)];
  if (over) reorderSurfaces(paneId, surfaceId, over.id, { workspaceId });
}

registerCliHandler("surface.list", (params): SurfaceListResult => {
  const target = parseCliParams(ListParamsSchema, params);
  const scope = target.paneId !== undefined ? "pane" : "workspace";
  const { workspaceId, paneId } = resolveTarget(target, scope);
  const workspace = getWorkspace(workspaceId);
  if (!workspace) {
    throw new CliHandlerError(
      "not_found",
      `workspace not found: ${workspaceId}`,
    );
  }
  const surfaces: SurfaceInfo[] = [];
  forEachLeaf(workspace.layout, (leaf) => {
    if (scope === "pane" && leaf.id !== paneId) return;
    for (const surface of leaf.surfaces) {
      surfaces.push(describeSurface(workspaceId, leaf, surface));
    }
  });
  return { surfaces };
});

registerCliHandler("surface.create", (params): SurfaceCreateResult => {
  const { browser, url, cwd, focus, ...target } = parseCliParams(
    CreateParamsSchema,
    params,
  );
  const { workspaceId, paneId } = resolveTarget(target, "pane");
  const surfaceId = addSurface(paneId, browser ? "browser" : "terminal", {
    url,
    cwd,
    workspaceId,
    activate: true,
    focusPane: focus,
  });
  if (!surfaceId) {
    throw new CliHandlerError("internal_error", "tab was not created");
  }
  if (focus) setActiveWorkspace(workspaceId);
  else consumeBrowserUrlFocus(surfaceId);
  return { workspaceId, paneId, surfaceId };
});

registerCliHandler("surface.focus", (params): SurfaceRefResult => {
  const { workspaceId, paneId, surfaceId } = resolveTarget(
    parseCliParams(TargetParamsSchema, params),
    "surface",
  );
  navigateToSurface(workspaceId, paneId, surfaceId);
  return { surfaceId };
});

registerCliHandler("surface.close", (params): SurfaceRefResult => {
  const target = parseCliParams(TargetParamsSchema, params);
  const { workspaceId, paneId, surfaceId } = resolveTarget(target, "surface");
  closeTab(workspaceId, paneId, surfaceId, target.callerSurfaceId);
  return { surfaceId };
});

registerCliHandler("surface.rename", (params): SurfaceRefResult => {
  const { name, ...target } = parseCliParams(RenameParamsSchema, params);
  const { workspaceId, paneId, surfaceId } = resolveTarget(target, "surface");
  renameSurface(workspaceId, paneId, surfaceId, name);
  return { surfaceId };
});

registerCliHandler("surface.move", (params): SurfaceMoveResult => {
  const { toPaneId, index, ...target } = parseCliParams(
    MoveParamsSchema,
    params,
  );
  const { workspaceId, paneId, surfaceId } = resolveTarget(target, "surface");
  const destination = resolveTarget({ paneId: toPaneId }, "pane");
  if (destination.workspaceId !== workspaceId) {
    throw new CliHandlerError(
      "invalid_params",
      `toPaneId is not in workspace ${workspaceId}`,
    );
  }
  if (destination.paneId !== paneId) {
    moveSurfaceToPane(paneId, surfaceId, destination.paneId, {
      workspaceId,
      index,
      focus: false,
    });
  } else if (index !== undefined) {
    reorderWithinPane(workspaceId, paneId, surfaceId, index);
  }
  return { surfaceId, paneId: destination.paneId };
});
