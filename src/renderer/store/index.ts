export { getState, getWorkspace, useWorkspaceStore } from "./core";
export { bootStore } from "./init";

export {
  addNotification,
  clearNotifications,
  dismissNotification,
  formatNotificationDisplay,
  markNotificationRead,
  markSurfaceNotificationsRead,
  onNotificationAdded,
  unreadCount,
} from "./notifications";

export {
  clampSidebarWidth,
  setSidebarWidth,
  setTerminalBackground,
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
  resizeSplit,
  setActiveSurface,
  setActiveWorkspace,
  setFocusedPane,
  splitPane,
  updateTerminalSurface,
} from "./workspaces";
