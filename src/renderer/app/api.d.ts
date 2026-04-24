import type {
  AppConfig,
  AppMode,
  ConfigureAgentHooksResult,
  CreatePtyResult,
  NotificationFirePayload,
} from "../../shared/types";

export interface AppAPI {
  mode: AppMode;
  readConfig: () => Promise<AppConfig>;
  createPty: (options: {
    cwd?: string;
    surfaceId: string;
  }) => Promise<CreatePtyResult>;
  writePty: (ptyId: string, data: string) => void;
  resizePty: (ptyId: string, cols: number, rows: number) => void;
  killPty: (ptyId: string) => void;
  replayPty: (ptyId: string) => Promise<string>;
  pruneTerminalBuffers: (surfaceIds: string[]) => Promise<void>;
  onPtyData: (ptyId: string, callback: (data: string) => void) => () => void;
  onPtyExit: (
    ptyId: string,
    callback: (exitCode: number, signal?: number) => void,
  ) => () => void;
  detectAgentHooks: (params: { providerId: string }) => Promise<boolean>;
  configureAgentHooks: (params: {
    providerId: string;
  }) => Promise<ConfigureAgentHooksResult>;
  fireNotification: (payload: NotificationFirePayload) => void;
  onNotificationClick: (
    callback: (data: {
      workspaceId: string;
      paneId: string;
      surfaceId: string;
    }) => void,
  ) => () => void;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  onWindowMaximizedChange: (
    callback: (maximized: boolean) => void,
  ) => () => void;
}

declare global {
  interface Window {
    app: AppAPI;
  }
}
