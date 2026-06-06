import type { CommandId } from "../../shared/keybindings/types";
import type { LeafPane } from "../../shared/types";
import { findLeafPane } from "../components/Layout/pane-tree";
import {
  addSurface,
  closePane,
  closeSurface,
  createWorkspace,
  setActiveSurface,
  setActiveWorkspace,
  splitPane,
  stepUiScale,
} from "../store";
import { getActiveWorkspace, getState } from "../store/core";

function focusedLeaf(): { paneId: string; leaf: LeafPane } | null {
  const ws = getActiveWorkspace();
  const paneId = getState().focusedPaneId;
  if (!ws || !paneId) return null;
  const leaf = findLeafPane(ws.layout, paneId);
  return leaf ? { paneId, leaf } : null;
}

function cycleTab(delta: number): void {
  const focused = focusedLeaf();
  if (!focused) return;
  const ids = focused.leaf.surfaces.map((s) => s.id);
  if (ids.length < 2) return;
  const current = ids.indexOf(focused.leaf.activeSurfaceId);
  const next = ids[(current + delta + ids.length) % ids.length];
  if (next) setActiveSurface(focused.paneId, next);
}

function cycleWorkspace(delta: number): void {
  const { workspaces, activeWorkspaceId } = getState();
  if (workspaces.length < 2 || activeWorkspaceId === null) return;
  const current = workspaces.findIndex((w) => w.id === activeWorkspaceId);
  if (current < 0) return;
  const next =
    workspaces[(current + delta + workspaces.length) % workspaces.length];
  if (next) setActiveWorkspace(next.id);
}

function selectWorkspace(index: number): void {
  const ws = getState().workspaces[index];
  if (ws) setActiveWorkspace(ws.id);
}

export function runCommand(id: CommandId): void {
  const focusedPaneId = getState().focusedPaneId;
  switch (id) {
    case "pane.splitRight":
      if (focusedPaneId) splitPane(focusedPaneId, "vertical");
      return;
    case "pane.splitDown":
      if (focusedPaneId) splitPane(focusedPaneId, "horizontal");
      return;
    case "pane.close":
      if (focusedPaneId) closePane(focusedPaneId);
      return;
    case "tab.new":
      if (focusedPaneId)
        addSurface(focusedPaneId, "terminal", { activate: true });
      return;
    case "tab.close": {
      const focused = focusedLeaf();
      if (focused) closeSurface(focused.paneId, focused.leaf.activeSurfaceId);
      return;
    }
    case "tab.next":
      cycleTab(1);
      return;
    case "tab.prev":
      cycleTab(-1);
      return;
    case "workspace.new":
      createWorkspace();
      return;
    case "workspace.next":
      cycleWorkspace(1);
      return;
    case "workspace.prev":
      cycleWorkspace(-1);
      return;
    case "ui.zoomIn":
      stepUiScale(1);
      return;
    case "ui.zoomOut":
      stepUiScale(-1);
      return;
    case "workspace.select.1":
    case "workspace.select.2":
    case "workspace.select.3":
    case "workspace.select.4":
    case "workspace.select.5":
    case "workspace.select.6":
    case "workspace.select.7":
    case "workspace.select.8":
      selectWorkspace(Number(id.slice("workspace.select.".length)) - 1);
      return;
    default:
      // browser.* commands are handled in the main process
      return;
  }
}
