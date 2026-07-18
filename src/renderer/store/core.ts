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

// State-parameterized so subscribers can use it in selectors; the get*
// variants below are conveniences over the current state.
export function selectWorkspace(
  s: AppState,
  id: string | null,
): Workspace | undefined {
  if (id === null) return undefined;
  return s.workspaces.find((w) => w.id === id);
}

export function getWorkspace(id: string | null): Workspace | undefined {
  return selectWorkspace(getState(), id);
}

export function getActiveWorkspace(): Workspace | undefined {
  return getWorkspace(getState().activeWorkspaceId);
}

export function selectActiveWorkspace(s: AppState): Workspace | undefined {
  return selectWorkspace(s, s.activeWorkspaceId);
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

// Isolate listener failures so one throwing subscriber can't starve the rest
// (or, in commit's case, prevent the state change from being persisted).
function notifyListeners(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch (err) {
      console.error("Store listener failed:", err);
    }
  }
}

export function commit(): void {
  scheduleSave();
  notifyListeners();
}

export function notify(): void {
  notifyListeners();
}

export function subscribeWorkspaceStore(listener: () => void): () => void {
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
  return useSyncExternalStore(subscribeWorkspaceStore, () =>
    selector ? selector(getState()) : getState(),
  );
}
