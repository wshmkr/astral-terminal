import type { SplitDirection, SurfaceKind } from "../types";
import type { TargetParams } from "./target";

export interface WorkspaceListParams {
  layout?: boolean;
}

export interface WorkspaceCreateParams {
  name?: string;
  cwd?: string;
  focus?: boolean;
}

export interface WorkspaceRenameParams extends TargetParams {
  name: string;
}

export interface WorkspaceReorderParams extends TargetParams {
  index: number;
}

export interface WorkspaceTabInfo {
  surfaceId: string;
  type: SurfaceKind;
  name: string;
  cwd?: string;
  url?: string;
  active: boolean;
}

export interface WorkspacePaneInfo {
  paneId: string;
  focused: boolean;
  tabs: WorkspaceTabInfo[];
}

export interface WorkspaceSplitInfo {
  splitId: string;
  direction: SplitDirection;
  sizes?: number[];
  children: WorkspaceLayoutNode[];
}

export type WorkspaceLayoutNode = WorkspacePaneInfo | WorkspaceSplitInfo;

export interface WorkspaceInfo {
  id: string;
  index: number;
  name: string;
  active: boolean;
}

export interface WorkspaceListEntry extends WorkspaceInfo {
  paneCount: number;
  tabCount: number;
  layout?: WorkspaceLayoutNode;
}

export interface WorkspaceListResult {
  workspaces: WorkspaceListEntry[];
}

export interface WorkspaceCreateResult {
  workspaceId: string;
  paneId: string;
  surfaceId: string;
}

export interface WorkspaceActionResult {
  workspaceId: string;
}
