import { useSyncExternalStore } from "react";
import type { AppState, Workspace } from "../../shared/types";
import { saveState } from "./persistence";

const SAVE_DEBOUNCE_MS = 300;

let state: AppState | undefined;

const listeners = new Set<() => void>();

export function initializeStore(initial: AppState): void {
  state = initial;
}

export function getState(): AppState {
  if (!state) throw new Error("Store not initialized");
  return state;
}

export function setState(next: AppState): void {
  state = next;
}

export function getWorkspace(id: string | null): Workspace | undefined {
  if (id === null) return undefined;
  return getState().workspaces.find((w) => w.id === id);
}

export function getActiveWorkspace(): Workspace | undefined {
  return getWorkspace(getState().activeWorkspaceId);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveState(getState());
  }, SAVE_DEBOUNCE_MS);
}

function flushPendingSave(): void {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  saveState(getState());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushPendingSave);
}

export function commit(): void {
  listeners.forEach((fn) => {
    fn();
  });
  scheduleSave();
}

export function notify(): void {
  listeners.forEach((fn) => {
    fn();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWorkspaceStore(): AppState;
export function useWorkspaceStore<T>(selector: (s: AppState) => T): T;
export function useWorkspaceStore<T>(
  selector?: (s: AppState) => T,
): T | AppState {
  return useSyncExternalStore(subscribe, () =>
    selector ? selector(getState()) : getState(),
  );
}
