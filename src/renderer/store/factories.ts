import {
  DEFAULT_CWD,
  type LeafPane,
  type Surface,
  type Workspace,
} from "../../shared/types";

export function generateId(): string {
  return crypto.randomUUID();
}

export function createTerminalSurface(cwd?: string): Surface {
  const resolvedCwd = cwd || DEFAULT_CWD;
  return {
    type: "terminal",
    id: generateId(),
    name: DEFAULT_CWD,
    cwd: resolvedCwd,
  };
}

export function createLeafPane(cwd?: string): LeafPane {
  const surface = createTerminalSurface(cwd);
  return {
    kind: "leaf",
    id: generateId(),
    surfaces: [surface],
    activeSurfaceId: surface.id,
  };
}

export function nextWorkspaceName(workspaces: Workspace[]): string {
  const used = new Set(workspaces.map((w) => w.name));
  let i = 1;
  while (used.has(`Workspace ${i}`)) i++;
  return `Workspace ${i}`;
}

export function createDefaultWorkspace(name: string): Workspace {
  return {
    id: generateId(),
    name,
    layout: createLeafPane(),
    notifications: [],
  };
}
