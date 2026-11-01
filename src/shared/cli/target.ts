import type { SurfaceKind } from "../types";

export interface TargetParams {
  workspaceId?: string | number;
  paneId?: string;
  surfaceId?: string;
  callerSurfaceId?: string;
}

export interface ResolvedTarget {
  workspaceId: string;
  paneId: string;
  surfaceId: string;
  surfaceType: SurfaceKind;
}
