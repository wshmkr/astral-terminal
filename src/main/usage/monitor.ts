import type { BrowserWindow } from "electron";
import {
  IPC,
  isShowingLastKnown,
  type ProviderUsage,
  type UsageData,
  type UsageMeter,
} from "../../shared/types";
import { usageAdapters } from "./registry";

const POLL_INTERVAL_MS = 300_000;

let getMainWindow: (() => BrowserWindow | null) | null = null;
let initialized = false;
let inFlight = false;
let lastFetchStartedAt = 0;

let cache: UsageData = { providers: [] };

interface LastGood {
  meters: UsageMeter[];
  fetchedAt: number | null;
}
const lastGood = new Map<string, LastGood>();

function broadcast(): void {
  getMainWindow?.()?.webContents.send(IPC.usage.status, cache);
}

export function getUsage(): UsageData {
  return cache;
}

function reconcile(usage: ProviderUsage): ProviderUsage {
  if (usage.status === "ok") {
    lastGood.set(usage.provider, {
      meters: usage.meters,
      fetchedAt: usage.fetchedAt,
    });
    return usage;
  }
  if (isShowingLastKnown(usage.status)) {
    const prior = lastGood.get(usage.provider);
    if (prior) {
      return { ...usage, meters: prior.meters, fetchedAt: prior.fetchedAt };
    }
    return usage;
  }
  lastGood.delete(usage.provider);
  return usage;
}

async function refreshAll(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  lastFetchStartedAt = Date.now();
  try {
    const results = await Promise.all(
      usageAdapters.map((a) => a.fetchUsage().catch(() => null)),
    );
    const providers = results
      .filter((r): r is ProviderUsage => r !== null)
      .map(reconcile);
    cache = { providers };
    broadcast();
  } finally {
    inFlight = false;
  }
}

export function initUsageMonitor(
  getMainWindowFn: () => BrowserWindow | null,
): () => void {
  if (initialized) return () => {};
  initialized = true;
  getMainWindow = getMainWindowFn;

  void refreshAll();

  const pollTimer = setInterval(() => {
    if (
      getMainWindow?.()?.isFocused() &&
      Date.now() - lastFetchStartedAt >= POLL_INTERVAL_MS
    ) {
      void refreshAll();
    }
  }, POLL_INTERVAL_MS);

  const onFocus = () => {
    if (Date.now() - lastFetchStartedAt >= POLL_INTERVAL_MS) void refreshAll();
  };
  getMainWindow()?.on("focus", onFocus);

  return () => {
    clearInterval(pollTimer);
    getMainWindow?.()?.removeListener("focus", onFocus);
    getMainWindow = null;
    initialized = false;
  };
}
