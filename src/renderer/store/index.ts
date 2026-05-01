export {
  setAppTheme,
  setFontFamily,
  setFontSize,
  setTerminalTheme,
  setUiScale,
  stepUiScale,
} from "./appearance";
export {
  getState,
  getWorkspace,
  selectActiveWorkspace,
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
  renameSurface,
  renameWorkspace,
  reorderSurfaces,
  reorderWorkspaces,
  resizeSplit,
  setActiveSurface,
  setActiveWorkspace,
  setFocusedPane,
  splitPane,
  updateTerminalSurface,
} from "./workspaces";
