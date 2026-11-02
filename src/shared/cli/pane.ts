import type { TargetParams } from "./target";

export const PANE_SPLIT_DIRECTIONS = ["left", "right", "up", "down"] as const;

export type PaneSplitDirection = (typeof PANE_SPLIT_DIRECTIONS)[number];

export const PANE_MIN_SIZE_PERCENT = 5;
export const PANE_MAX_SIZE_PERCENT = 95;

export interface PaneSplitParams extends TargetParams {
  direction: PaneSplitDirection;
  browser?: boolean;
  url?: string;
  focus?: boolean;
}

export interface PaneSplitResult {
  workspaceId: string;
  paneId: string;
  surfaceId: string;
}

export interface PaneInfo {
  paneId: string;
  workspaceId: string;
  focused: boolean;
  activeSurfaceId: string;
  tabCount: number;
}

export interface PaneListResult {
  panes: PaneInfo[];
}

export interface PaneRefResult {
  paneId: string;
}

export interface PaneResizeParams extends TargetParams {
  size: number;
}

export interface PaneResizeResult {
  paneId: string;
  sizes: number[];
}
