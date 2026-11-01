import {
  DEFAULT_BROWSER_URL,
  DEFAULT_CWD,
  type LeafPane,
  type Surface,
  type SurfaceKind,
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

export function createBrowserSurface(url?: string): Surface {
  return {
    type: "browser",
    id: generateId(),
    name: "New Tab",
    url: url || DEFAULT_BROWSER_URL,
  };
}

export function createSurface(
  kind: SurfaceKind,
  opts: { url?: string; cwd?: string } = {},
): Surface {
  return kind === "browser"
    ? createBrowserSurface(opts.url)
    : createTerminalSurface(opts.cwd);
}

export function createLeafPane(
  surface: Surface = createTerminalSurface(),
): LeafPane {
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

export function createDefaultWorkspace(name: string, cwd?: string): Workspace {
  return {
    id: generateId(),
    name,
    layout: createLeafPane(createTerminalSurface(cwd)),
    notifications: [],
  };
}
