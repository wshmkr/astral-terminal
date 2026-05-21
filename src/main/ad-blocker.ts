import { promises as fs } from "node:fs";
import path from "node:path";
import { ElectronBlocker } from "@ghostery/adblocker-electron";
import { app, type Session } from "electron";

const enabledSessions = new Set<Session>();
let blockerPromise: Promise<ElectronBlocker> | null = null;

function getBlocker(): Promise<ElectronBlocker> {
  if (blockerPromise) return blockerPromise;
  const cachePath = path.join(app.getPath("userData"), "adblock-engine.bin");
  blockerPromise = ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
    path: cachePath,
    read: fs.readFile,
    write: fs.writeFile,
  }).catch((err) => {
    blockerPromise = null;
    throw err;
  });
  return blockerPromise;
}

export async function enableAdBlock(session: Session): Promise<void> {
  enabledSessions.add(session);
  try {
    const blocker = await getBlocker();
    if (enabledSessions.has(session) && !blocker.isBlockingEnabled(session)) {
      blocker.enableBlockingInSession(session);
    }
  } catch (err) {
    console.error("[ad-blocker] failed to initialize:", err);
  }
}

export async function disableAdBlock(session: Session): Promise<void> {
  enabledSessions.delete(session);
  if (!blockerPromise) return;
  try {
    const blocker = await blockerPromise;
    if (blocker.isBlockingEnabled(session)) {
      blocker.disableBlockingInSession(session);
    }
  } catch {}
}
