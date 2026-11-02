import { z } from "zod";
import type {
  WorkspaceActionResult,
  WorkspaceCreateParams,
  WorkspaceCreateResult,
  WorkspaceInfo,
  WorkspaceLayoutNode,
  WorkspaceListEntry,
  WorkspaceListParams,
  WorkspaceListResult,
  WorkspaceRenameParams,
  WorkspaceReorderParams,
  WorkspaceTabInfo,
} from "../../../shared/cli/workspace";
import {
  isTerminalSurface,
  type PaneNode,
  type Surface,
  type Workspace,
} from "../../../shared/types";
import { forEachLeaf } from "../../components/Layout/pane-tree";
import {
  CliHandlerError,
  parseCliParams,
  registerCliHandler,
} from "../cli-bridge";
import { getState } from "../core";
import {
  closeWorkspace,
  createWorkspace,
  findPaneBySurfaceId,
  getWorkspaceFocusedPaneId,
  renameWorkspace,
  reorderWorkspaces,
  setActiveWorkspace,
} from "../workspaces";
import { resolveTarget, TargetParamsSchema } from "./target";

const MAX_NAME_LENGTH = 64;

// Closing the caller's workspace kills the caller, so its reply has to go out first.
const CALLER_WORKSPACE_CLOSE_DELAY_MS = 100;

const NameSchema = z
  .string()
  .transform((name) =>
    name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH),
  )
  .refine((name) => name.length > 0, { error: "must not be empty" });

const ListParamsSchema = z.object({
  layout: z.boolean().optional(),
}) satisfies z.ZodType<WorkspaceListParams>;

const CreateParamsSchema = z.object({
  name: NameSchema.optional(),
  cwd: z.string().optional(),
  focus: z.boolean().optional(),
}) satisfies z.ZodType<WorkspaceCreateParams>;

const RenameParamsSchema = TargetParamsSchema.extend({
  name: NameSchema,
}) satisfies z.ZodType<WorkspaceRenameParams>;

const ReorderParamsSchema = TargetParamsSchema.extend({
  index: z.number().int().min(1),
}) satisfies z.ZodType<WorkspaceReorderParams>;

function describeWorkspace(ws: Workspace, position: number): WorkspaceInfo {
  return {
    id: ws.id,
    index: position + 1,
    name: ws.name,
    active: getState().activeWorkspaceId === ws.id,
  };
}

function describeTab(
  surface: Surface,
  activeSurfaceId: string,
): WorkspaceTabInfo {
  return {
    surfaceId: surface.id,
    type: surface.type,
    name: surface.name,
    ...(isTerminalSurface(surface)
      ? { cwd: surface.cwd }
      : { url: surface.url }),
    active: surface.id === activeSurfaceId,
  };
}

function describeLayout(
  node: PaneNode,
  focusedPaneId: string | null,
): WorkspaceLayoutNode {
  if (node.kind === "split") {
    return {
      splitId: node.id,
      direction: node.direction,
      ...(node.sizes && { sizes: node.sizes }),
      children: node.children.map((child) =>
        describeLayout(child, focusedPaneId),
      ),
    };
  }
  return {
    paneId: node.id,
    focused: node.id === focusedPaneId,
    tabs: node.surfaces.map((surface) =>
      describeTab(surface, node.activeSurfaceId),
    ),
  };
}

function describeListEntry(
  ws: Workspace,
  position: number,
  layout: boolean,
): WorkspaceListEntry {
  let paneCount = 0;
  let tabCount = 0;
  forEachLeaf(ws.layout, (leaf) => {
    paneCount += 1;
    tabCount += leaf.surfaces.length;
  });
  return {
    ...describeWorkspace(ws, position),
    paneCount,
    tabCount,
    ...(layout && {
      layout: describeLayout(ws.layout, getWorkspaceFocusedPaneId(ws.id)),
    }),
  };
}

registerCliHandler("workspace.list", (params): WorkspaceListResult => {
  const { layout = false } = parseCliParams(ListParamsSchema, params);
  return {
    workspaces: getState().workspaces.map((ws, position) =>
      describeListEntry(ws, position, layout),
    ),
  };
});

registerCliHandler("workspace.current", (params): WorkspaceInfo => {
  const target = parseCliParams(TargetParamsSchema, params);
  const { workspaceId } = resolveTarget(target, "workspace");
  const { workspaces } = getState();
  const position = workspaces.findIndex((ws) => ws.id === workspaceId);
  const ws = workspaces[position];
  if (!ws) {
    throw new CliHandlerError(
      "not_found",
      `workspace not found: ${workspaceId}`,
    );
  }
  return describeWorkspace(ws, position);
});

registerCliHandler("workspace.create", (params): WorkspaceCreateResult => {
  const { name, cwd, focus } = parseCliParams(CreateParamsSchema, params);
  const ws = createWorkspace(name, { cwd, activate: false });
  if (focus || getState().activeWorkspaceId === null) {
    setActiveWorkspace(ws.id);
  }
  const { paneId, surfaceId } = resolveTarget(
    { workspaceId: ws.id },
    "workspace",
  );
  return { workspaceId: ws.id, paneId, surfaceId };
});

registerCliHandler("workspace.select", (params): WorkspaceActionResult => {
  const target = parseCliParams(TargetParamsSchema, params);
  const { workspaceId } = resolveTarget(target, "workspace");
  setActiveWorkspace(workspaceId);
  return { workspaceId };
});

registerCliHandler("workspace.rename", (params): WorkspaceActionResult => {
  const { name, ...target } = parseCliParams(RenameParamsSchema, params);
  const { workspaceId } = resolveTarget(target, "workspace");
  renameWorkspace(workspaceId, name);
  return { workspaceId };
});

registerCliHandler("workspace.close", (params): WorkspaceActionResult => {
  const target = parseCliParams(TargetParamsSchema, params);
  const { workspaceId } = resolveTarget(target, "workspace");
  const close = () => closeWorkspace(workspaceId);
  const isCallerWorkspace =
    target.callerSurfaceId !== undefined &&
    findPaneBySurfaceId(target.callerSurfaceId)?.workspaceId === workspaceId;
  if (isCallerWorkspace) setTimeout(close, CALLER_WORKSPACE_CLOSE_DELAY_MS);
  else close();
  return { workspaceId };
});

registerCliHandler("workspace.reorder", (params): WorkspaceActionResult => {
  const { index, ...target } = parseCliParams(ReorderParamsSchema, params);
  const { workspaceId } = resolveTarget(target, "workspace");
  const over = getState().workspaces[index - 1];
  if (!over) {
    throw new CliHandlerError("not_found", `workspace not found: #${index}`);
  }
  reorderWorkspaces(workspaceId, over.id);
  return { workspaceId };
});
