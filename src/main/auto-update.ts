import { app, autoUpdater } from "electron";
import { APP_GITHUB_SLUG } from "../shared/meta";
import { loadUpdatePrefs } from "./update-prefs";

const FEED_HOST = "https://update.electronjs.org";

autoUpdater.on("error", (err) => {
  console.error("auto-updater error:", err);
});

export function checkForUpdatesOnStartup(): void {
  if (process.platform !== "win32") return;
  if (!app.isPackaged) return;
  if (!loadUpdatePrefs().autoUpdatesEnabled) return;

  const feedURL = `${FEED_HOST}/${APP_GITHUB_SLUG}/${process.platform}-${process.arch}/${app.getVersion()}`;
  autoUpdater.setFeedURL({
    url: feedURL,
    headers: { "User-Agent": `${app.getName()}/${app.getVersion()}` },
  });
  autoUpdater.checkForUpdates();
}
