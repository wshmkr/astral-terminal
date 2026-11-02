export const SURFACE_CLEAR_HISTORY_VIEW = "surface.clearHistoryView";

export interface TerminalModes {
  applicationCursorKeys: boolean;
  bracketedPaste: boolean;
}

export interface SurfaceReadOptions {
  scrollback?: boolean | undefined;
  lines?: number | undefined;
  ansi?: boolean | undefined;
}

export interface SurfaceIoResult {
  surfaceId: string;
}

export interface SurfaceSendTextResult extends SurfaceIoResult {
  bytes: number;
}

export interface SurfaceReadResult extends SurfaceIoResult {
  text: string;
}
