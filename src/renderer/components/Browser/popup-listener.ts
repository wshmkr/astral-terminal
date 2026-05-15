import {
  addSurface,
  findPaneBySurfaceId,
  getState,
  setActiveWorkspace,
} from "../../store";

export function installBrowserPopupListener(): () => void {
  return window.app.onBrowserOpenNewTab(
    ({ sourceSurfaceId, url, background }) => {
      const location = findPaneBySurfaceId(sourceSurfaceId);
      if (!location) return;
      if (getState().activeWorkspaceId !== location.workspaceId) {
        setActiveWorkspace(location.workspaceId);
      }
      addSurface(location.paneId, "browser", { url, activate: !background });
    },
  );
}
