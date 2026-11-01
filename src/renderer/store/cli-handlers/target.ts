import { z } from "zod";
import type { ResolvedTarget, TargetParams } from "../../../shared/cli/target";
import type { LeafPane, Surface, Workspace } from "../../../shared/types";
import {
  findLeafPane,
  findLeafWhere,
  forEachLeaf,
  getActiveSurface,
} from "../../components/Layout/pane-tree";
import { CliHandlerError } from "../cli-bridge";
import { getState } from "../core";
import { getWorkspaceFocusedPaneId } from "../workspaces";

export type TargetNeed = "workspace" | "pane" | "surface";

const MIN_PREFIX_LENGTH = 4;

export const TargetParamsSchema = z.object({
  workspaceId: z.union([z.string(), z.number().int()]).optional(),
  paneId: z.string().optional(),
  surfaceId: z.string().optional(),
  callerSurfaceId: z.string().optional(),
}) satisfies z.ZodType<TargetParams>;

interface Location {
  workspace: Workspace;
  leaf: LeafPane;
  surface: Surface;
}

function matchId<T>(
  kind: string,
  query: string,
  items: readonly T[],
  idOf: (item: T) => string,
): T {
  const exact = items.find((item) => idOf(item) === query);
  if (exact) return exact;
  if (query.length < MIN_PREFIX_LENGTH) {
    throw new CliHandlerError("not_found", `${kind} not found: ${query}`);
  }
  const matches = items.filter((item) => idOf(item).startsWith(query));
  if (matches.length > 1) {
    throw new CliHandlerError(
      "ambiguous",
      `${kind} id prefix ${query} matches ${matches.length} ${kind}s`,
    );
  }
  const [match] = matches;
  if (!match) {
    throw new CliHandlerError("not_found", `${kind} not found: ${query}`);
  }
  return match;
}

function parseWorkspaceIndex(
  workspaces: readonly Workspace[],
  query: string | number,
): number | null {
  if (typeof query === "number") return query;
  if (!/^[1-9]\d*$/.test(query)) return null;
  if (workspaces.some((ws) => ws.id === query)) return null;
  if (
    query.length >= MIN_PREFIX_LENGTH &&
    workspaces.some((ws) => ws.id.startsWith(query))
  ) {
    return null;
  }
  return Number(query);
}

function findWorkspace(
  workspaces: readonly Workspace[],
  query: string | number,
): Workspace {
  const index = parseWorkspaceIndex(workspaces, query);
  if (index === null) {
    return matchId("workspace", String(query), workspaces, (ws) => ws.id);
  }
  const ws = workspaces[index - 1];
  if (!ws) {
    throw new CliHandlerError("not_found", `workspace not found: #${index}`);
  }
  return ws;
}

function collectLeaves(
  workspaces: readonly Workspace[],
): Array<{ workspace: Workspace; leaf: LeafPane }> {
  const out: Array<{ workspace: Workspace; leaf: LeafPane }> = [];
  for (const workspace of workspaces) {
    forEachLeaf(workspace.layout, (leaf) => out.push({ workspace, leaf }));
  }
  return out;
}

function collectSurfaces(workspaces: readonly Workspace[]): Location[] {
  return collectLeaves(workspaces).flatMap(({ workspace, leaf }) =>
    leaf.surfaces.map((surface) => ({ workspace, leaf, surface })),
  );
}

function locateActive(workspace: Workspace, leaf: LeafPane): Location {
  const surface = getActiveSurface(leaf) ?? leaf.surfaces[0];
  if (!surface) {
    throw new CliHandlerError("not_found", `pane ${leaf.id} has no surface`);
  }
  return { workspace, leaf, surface };
}

function locateFocused(workspace: Workspace): Location {
  const paneId = getWorkspaceFocusedPaneId(workspace.id);
  const leaf = paneId ? findLeafPane(workspace.layout, paneId) : null;
  if (!leaf) {
    throw new CliHandlerError(
      "not_found",
      `workspace ${workspace.id} has no focused pane`,
    );
  }
  return locateActive(workspace, leaf);
}

function locateCaller(
  workspaces: readonly Workspace[],
  callerSurfaceId: string,
): Location | null {
  for (const workspace of workspaces) {
    const leaf = findLeafWhere(workspace.layout, (l) =>
      l.surfaces.some((s) => s.id === callerSurfaceId),
    );
    const surface = leaf?.surfaces.find((s) => s.id === callerSurfaceId);
    if (leaf && surface) return { workspace, leaf, surface };
  }
  return null;
}

function locateExplicit(
  workspaces: readonly Workspace[],
  params: TargetParams,
  need: TargetNeed,
): Location | null {
  const workspace =
    params.workspaceId !== undefined
      ? findWorkspace(workspaces, params.workspaceId)
      : null;
  if (need === "workspace") {
    return workspace ? locateFocused(workspace) : null;
  }

  const pane =
    params.paneId !== undefined
      ? matchId(
          "pane",
          params.paneId,
          collectLeaves(workspaces),
          (p) => p.leaf.id,
        )
      : null;
  const surface =
    params.surfaceId !== undefined
      ? matchId(
          "surface",
          params.surfaceId,
          collectSurfaces(workspaces),
          (s) => s.surface.id,
        )
      : null;

  if (pane && surface && pane.leaf.id !== surface.leaf.id) {
    throw new CliHandlerError(
      "invalid_params",
      "paneId and surfaceId resolve to different panes",
    );
  }
  const narrowest = surface?.workspace ?? pane?.workspace;
  if (workspace && narrowest && workspace.id !== narrowest.id) {
    throw new CliHandlerError(
      "invalid_params",
      `${surface ? "surfaceId" : "paneId"} is not in workspace ${workspace.id}`,
    );
  }

  if (surface) return surface;
  if (pane) return locateActive(pane.workspace, pane.leaf);
  if (workspace) return locateFocused(workspace);
  return null;
}

function locateActiveWorkspace(
  workspaces: readonly Workspace[],
  activeWorkspaceId: string | null,
): Location {
  const workspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  if (!workspace) {
    throw new CliHandlerError("not_found", "no active workspace");
  }
  return locateFocused(workspace);
}

export function resolveTarget(
  params: TargetParams,
  need: TargetNeed,
): ResolvedTarget {
  const s = getState();
  const location =
    locateExplicit(s.workspaces, params, need) ??
    (params.callerSurfaceId !== undefined
      ? locateCaller(s.workspaces, params.callerSurfaceId)
      : null) ??
    locateActiveWorkspace(s.workspaces, s.activeWorkspaceId);
  return {
    workspaceId: location.workspace.id,
    paneId: location.leaf.id,
    surfaceId: location.surface.id,
    surfaceType: location.surface.type,
  };
}
