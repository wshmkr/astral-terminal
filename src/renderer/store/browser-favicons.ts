import { useSyncExternalStore } from "react";

const favicons = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  listeners.forEach((fn) => {
    fn();
  });
}

export function setBrowserFavicon(
  surfaceId: string,
  dataUrl: string | null,
): void {
  const existing = favicons.get(surfaceId) ?? null;
  if (existing === dataUrl) return;
  if (dataUrl === null) favicons.delete(surfaceId);
  else favicons.set(surfaceId, dataUrl);
  notify();
}

export function clearBrowserFavicon(surfaceId: string): void {
  if (!favicons.has(surfaceId)) return;
  favicons.delete(surfaceId);
  notify();
}

function getSnapshot(surfaceId: string): string | null {
  return favicons.get(surfaceId) ?? null;
}

export function useBrowserFavicon(surfaceId: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(surfaceId),
    () => null,
  );
}
