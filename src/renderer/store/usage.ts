import type { UsageData } from "../../shared/types";
import { getState, notify, setState, useWorkspaceStore } from "./core";

export const INITIAL_USAGE: UsageData = { providers: [] };

export function setUsage(usage: UsageData): void {
  const s = getState();
  if (s.usage === usage) return;
  setState({ ...s, usage });
  notify();
}

export function useUsage(): UsageData {
  return useWorkspaceStore((s) => s.usage);
}
