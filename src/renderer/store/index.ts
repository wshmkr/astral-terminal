export {
  setAccentColor,
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
  subscribeWorkspaceStore,
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
  dismissWelcome,
  setAgentHook,
  setAgentHookStatuses,
  setSidebarWidth,
  setWelcomeOpen,
  setWindowFocused,
  setWslDistro,
  updateNotificationSettings,
  updateUpdateSettings,
} from "./preferences";

export { setUpdateStatus } from "./update-status";

export {
  addSurface,
  closePane,
  closeSurface,
  closeWorkspace,
  createWorkspace,
  findPaneBySurfaceId,
  moveSurfaceToPane,
  renameSurface,
  renameWorkspace,
  reorderSurfaces,
  reorderWorkspaces,
  resizeSplit,
  setActiveSurface,
  setActiveWorkspace,
  setBrowserSurfaceUrl,
  setFocusedPane,
  splitPane,
  updateTerminalSurface,
} from "./workspaces";
