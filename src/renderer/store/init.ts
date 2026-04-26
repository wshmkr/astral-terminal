import type { AppState, Workspace } from "../../shared/types";
import { DEFAULT_SIDEBAR_WIDTH_PX } from "../components/Layout/layout-constants";
import {
  collectSurfaceIds,
  findFirstLeaf,
} from "../components/Layout/pane-tree";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "./appearance";
import { initializeStore } from "./core";
import { createDefaultWorkspace, nextWorkspaceName } from "./factories";
import { loadState } from "./persistence";
import { DEFAULT_NOTIFICATION_SETTINGS } from "./preferences";

const INITIAL_WINDOW_FOCUSED =
  typeof document !== "undefined" ? document.hasFocus() : true;

function initState(): AppState {
  const loaded = loadState();
  const isFirstRun = loaded === null;
  if (loaded && loaded.workspaces.length > 0) {
    const workspaces: Workspace[] = loaded.workspaces.map((pw) => ({
      id: pw.id,
      name: pw.name,
      layout: pw.layout,
      notifications: [],
    }));
    const activeWs = loaded.activeWorkspaceId
      ? (workspaces.find((w) => w.id === loaded.activeWorkspaceId) ??
        workspaces[0])
      : null;
    return {
      workspaces,
      activeWorkspaceId: activeWs?.id ?? null,
      focusedPaneId: activeWs ? findFirstLeaf(activeWs.layout) : null,
      sidebarWidth: loaded.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH_PX,
      appearance: normalizeAppearance(loaded.appearance),
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(loaded.notificationSettings ?? {}),
      },
      windowFocused: INITIAL_WINDOW_FOCUSED,
      settingsOpen: false,
      welcomeOpen: false,
    };
  }
  const seed = createDefaultWorkspace(nextWorkspaceName([]));
  return {
    workspaces: [seed],
    activeWorkspaceId: seed.id,
    focusedPaneId: seed.layout.id,
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH_PX,
    appearance: DEFAULT_APPEARANCE,
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    windowFocused: INITIAL_WINDOW_FOCUSED,
    settingsOpen: false,
    welcomeOpen: isFirstRun,
  };
}

export function bootStore(): void {
  const initial = initState();
  initializeStore(initial);

  if (typeof window !== "undefined" && window.app?.pruneTerminalBuffers) {
    const valid = initial.workspaces.flatMap((ws) =>
      collectSurfaceIds(ws.layout),
    );
    window.app.pruneTerminalBuffers(valid).catch((err) => {
      console.warn("pruneTerminalBuffers failed:", err);
    });
  }
}
