import type { AppState, Workspace } from "../../shared/types";
import { DEFAULT_SIDEBAR_WIDTH_PX } from "../components/Layout/layout-constants";
import {
  collectSurfaceIds,
  findFirstLeaf,
} from "../components/Layout/pane-tree";
import { DEFAULT_APPEARANCE } from "./appearance";
import { startCliActiveRefBridge } from "./cli-bridge";
import { initializeStore } from "./core";
import { createDefaultWorkspace, nextWorkspaceName } from "./factories";
import { loadState } from "./persistence";
import {
  DEFAULT_BROWSER_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_TERMINAL_SETTINGS,
  DEFAULT_UPDATE_SETTINGS,
} from "./preferences";
import { INITIAL_UPDATE_STATUS } from "./update-status";
import { INITIAL_USAGE } from "./usage";

const INITIAL_WINDOW_FOCUSED =
  typeof document !== "undefined" ? document.hasFocus() : true;

async function initState(): Promise<AppState> {
  const { settings, workspaces: loadedWorkspaces } = await loadState();
  const isFirstRun = settings === null && loadedWorkspaces === null;

  const appearance = {
    ...DEFAULT_APPEARANCE,
    ...(settings?.appearance ?? {}),
  };
  const notificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(settings?.notificationSettings ?? {}),
  };
  const updateSettings = {
    ...DEFAULT_UPDATE_SETTINGS,
    ...(settings?.updateSettings ?? {}),
  };
  const terminalSettings = {
    ...DEFAULT_TERMINAL_SETTINGS,
    ...(settings?.terminalSettings ?? {}),
  };
  const browserSettings = {
    ...DEFAULT_BROWSER_SETTINGS,
    ...(settings?.browserSettings ?? {}),
  };

  if (loadedWorkspaces && loadedWorkspaces.workspaces.length > 0) {
    const workspaces: Workspace[] = loadedWorkspaces.workspaces.map((pw) => ({
      id: pw.id,
      name: pw.name,
      layout: pw.layout,
      notifications: [],
    }));
    const activeWs = loadedWorkspaces.activeWorkspaceId
      ? (workspaces.find((w) => w.id === loadedWorkspaces.activeWorkspaceId) ??
        workspaces[0])
      : null;
    return {
      workspaces,
      activeWorkspaceId: activeWs?.id ?? null,
      focusedPaneId: activeWs ? findFirstLeaf(activeWs.layout) : null,
      sidebarWidth: loadedWorkspaces.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH_PX,
      appearance,
      notificationSettings,
      updateSettings,
      terminalSettings,
      browserSettings,
      agentHookStatuses: {},
      updateStatus: INITIAL_UPDATE_STATUS,
      usage: INITIAL_USAGE,
      windowFocused: INITIAL_WINDOW_FOCUSED,
      welcomeOpen: false,
    };
  }
  const seed = createDefaultWorkspace(nextWorkspaceName([]));
  return {
    workspaces: [seed],
    activeWorkspaceId: seed.id,
    focusedPaneId: seed.layout.id,
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH_PX,
    appearance,
    notificationSettings,
    updateSettings,
    terminalSettings,
    browserSettings,
    agentHookStatuses: {},
    updateStatus: INITIAL_UPDATE_STATUS,
    usage: INITIAL_USAGE,
    windowFocused: INITIAL_WINDOW_FOCUSED,
    welcomeOpen: isFirstRun,
  };
}

export async function bootStore(): Promise<void> {
  const initial = await initState();
  initializeStore(initial);
  startCliActiveRefBridge();

  if (typeof window !== "undefined" && window.app?.pruneTerminalBuffers) {
    const valid = initial.workspaces.flatMap((ws) =>
      collectSurfaceIds(ws.layout),
    );
    window.app.pruneTerminalBuffers(valid).catch((err) => {
      console.warn("pruneTerminalBuffers failed:", err);
    });
  }
}
