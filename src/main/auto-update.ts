import { app, autoUpdater, type BrowserWindow } from "electron";
import { APP_GITHUB_SLUG } from "../shared/meta";
import { IPC, type UpdateStatus } from "../shared/types";
import { loadSettings } from "./settings-store";

const FEED_HOST = "https://update.electronjs.org";

let getMainWindow: (() => BrowserWindow | null) | null = null;
let initialized = false;
let supported = false;

let currentStatus: UpdateStatus = {
  state: "idle",
  lastCheckedAt: null,
};

function broadcast(): void {
  getMainWindow?.()?.webContents.send(IPC.update.status, currentStatus);
}

function setStatus(next: UpdateStatus): void {
  currentStatus = next;
  broadcast();
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus;
}

export function initAutoUpdater(
  getMainWindowFn: () => BrowserWindow | null,
): void {
  if (initialized) return;
  initialized = true;
  getMainWindow = getMainWindowFn;

  supported = process.platform === "win32" && app.isPackaged;
  if (!supported) return;

  const feedURL = `${FEED_HOST}/${APP_GITHUB_SLUG}/${process.platform}-${process.arch}/${app.getVersion()}`;
  autoUpdater.setFeedURL({
    url: feedURL,
    headers: { "User-Agent": `${app.getName()}/${app.getVersion()}` },
  });

  autoUpdater.on("checking-for-update", () => {
    setStatus({
      state: "checking",
      lastCheckedAt: currentStatus.lastCheckedAt,
    });
  });

  autoUpdater.on("update-available", () => {
    setStatus({
      state: "downloading",
      lastCheckedAt: currentStatus.lastCheckedAt,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setStatus({
      state: "not-available",
      lastCheckedAt: Date.now(),
    });
  });

  autoUpdater.on(
    "update-downloaded",
    (_event, _releaseNotes, releaseName: string) => {
      setStatus({
        state: "downloaded",
        lastCheckedAt: Date.now(),
        downloadedVersion: releaseName || undefined,
      });
    },
  );

  autoUpdater.on("error", (err) => {
    console.error("auto-updater error:", err);
    setStatus({
      state: "error",
      lastCheckedAt: Date.now(),
      errorMessage: err.message,
    });
  });
}

export function checkForUpdatesNow(): void {
  if (!supported) return;
  if (
    currentStatus.state === "checking" ||
    currentStatus.state === "downloading" ||
    currentStatus.state === "downloaded"
  ) {
    return;
  }
  autoUpdater.checkForUpdates();
}

export function checkForUpdatesOnStartup(): void {
  if (!supported) return;
  if (loadSettings()?.updateSettings?.autoEnabled === false) return;
  checkForUpdatesNow();
}

export function quitAndInstall(): void {
  if (!supported) return;
  if (currentStatus.state !== "downloaded") return;
  autoUpdater.quitAndInstall();
}
