import { openUrlNearSurface } from "../../store";

export function installBrowserPopupListener(): () => void {
  return window.app.onBrowserOpenNewTab(
    ({ sourceSurfaceId, url, background }) => {
      openUrlNearSurface(sourceSurfaceId, url, background);
    },
  );
}
