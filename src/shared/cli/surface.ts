import type { SurfaceKind } from "../types";
import type { TargetParams } from "./target";

export interface SurfaceInfo {
  surfaceId: string;
  paneId: string;
  workspaceId: string;
  type: SurfaceKind;
  name: string;
  cwd?: string;
  url?: string;
  active: boolean;
}

export type SurfaceListParams = Omit<TargetParams, "surfaceId">;

export interface SurfaceListResult {
  surfaces: SurfaceInfo[];
}

export interface SurfaceCreateParams extends TargetParams {
  browser?: boolean;
  url?: string;
  cwd?: string;
  focus?: boolean;
}

export interface SurfaceCreateResult {
  workspaceId: string;
  paneId: string;
  surfaceId: string;
}

export interface SurfaceRefResult {
  surfaceId: string;
}

export interface SurfaceRenameParams extends TargetParams {
  name: string;
}

export interface SurfaceMoveParams extends TargetParams {
  toPaneId: string;
  index?: number;
}

export interface SurfaceMoveResult {
  surfaceId: string;
  paneId: string;
}
