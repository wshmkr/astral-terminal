import type { UpdateStatus } from "../../shared/types";
import { getState, notify, setState } from "./core";

export const INITIAL_UPDATE_STATUS: UpdateStatus = {
  state: "idle",
  lastCheckedAt: null,
};

export function setUpdateStatus(status: UpdateStatus): void {
  const s = getState();
  if (s.updateStatus === status) return;
  setState({ ...s, updateStatus: status });
  notify();
}

export function requestUpdateCheck(): Promise<void> {
  return window.app.requestUpdateCheck();
}

export function installUpdate(): Promise<void> {
  return window.app.installUpdate();
}
