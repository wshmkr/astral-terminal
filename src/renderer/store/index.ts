export {
  setAccentColor,
  setAppTheme,
  setFontFamily,
  setFontSize,
  setTerminalLineHeight,
  setTerminalTheme,
  setUiScale,
  stepUiScale,
} from "./appearance";
export {
  clearBrowserFavicon,
  setBrowserFavicon,
  useBrowserFavicon,
} from "./browser-favicons";
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
  updateBrowserSettings,
  updateNotificationSettings,
  updateUpdateSettings,
  useSidebarWidth,
} from "./preferences";

export { setUpdateStatus } from "./update-status";

export { setUsage, useUsage } from "./usage";

export {
  addSurface,
  closePane,
  closeSurface,
  closeWorkspace,
  consumeBrowserUrlFocus,
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
  splitPaneWithSurface,
  updateTerminalSurface,
} from "./workspaces";
