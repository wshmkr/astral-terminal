import { createRoot } from "react-dom/client";
import type { UpdateState, UpdateStatus } from "../../shared/types";
import { SettingsApp } from "./app";
import { patchLocalUpdateStatus } from "./store";

declare global {
  interface Window {
    setUpdateState?: (state: UpdateState) => void;
  }
}

const DEV_UPDATE_STATUS: Record<UpdateState, () => UpdateStatus> = {
  idle: () => ({ state: "idle", lastCheckedAt: null }),
  checking: () => ({ state: "checking", lastCheckedAt: Date.now() }),
  "not-available": () => ({
    state: "not-available",
    lastCheckedAt: Date.now(),
  }),
  downloading: () => ({
    state: "downloading",
    lastCheckedAt: Date.now(),
  }),
  downloaded: () => ({
    state: "downloaded",
    lastCheckedAt: Date.now(),
    version: "0.0.0-dev",
  }),
  error: () => ({
    state: "error",
    lastCheckedAt: Date.now(),
    errorMessage: "Simulated dev error",
  }),
};

function installDevHelpers() {
  window.setUpdateState = (state) =>
    patchLocalUpdateStatus(DEV_UPDATE_STATUS[state]());
}

export function mount(rootEl: HTMLElement): void {
  rootEl.style.height = "100vh";
  if (import.meta.env.DEV) installDevHelpers();
  createRoot(rootEl).render(<SettingsApp />);
}
