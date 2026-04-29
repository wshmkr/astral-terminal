export {
  setAppTheme,
  setFontFamily,
  setFontSize,
  setTerminalTheme,
  setUiScale,
  stepUiScale,
} from "./appearance";
export {
  getActiveWorkspace,
  getState,
  getWorkspace,
  useWorkspaceStore,
} from "./core";
export { bootStore } from "./init";

export {
  addNotification,
  clearNotifications,
  dismissNotification,
  formatNotificationDisplay,
  isUserActivelyViewing,
  markNotificationRead,
  markSurfaceNotificationsRead,
  onNotificationAdded,
  unreadCount,
  unreadSurfaceIds,
} from "./notifications";

export {
  clampSidebarWidth,
  setAgentHook,
  setSettingsOpen,
  setSidebarWidth,
  setWindowFocused,
  updateNotificationSettings,
} from "./preferences";

export {
  addSurface,
  closePane,
  closeSurface,
  closeWorkspace,
  createWorkspace,
  findWorkspaceIdForPane,
  renameSurface,
  renameWorkspace,
  reorderSurfacesInPane,
  reorderWorkspaces,
  resizeSplit,
  setActiveSurface,
  setActiveWorkspace,
  setFocusedPane,
  splitPane,
  updateTerminalSurface,
} from "./workspaces";
