import type { AgentName } from "../../shared/agent-hooks";
import type { ProviderUsage } from "../../shared/types";

export interface UsageProviderAdapter {
  name: AgentName;
  // null  -> provider not present on this machine (omit it entirely)
  // value -> a ProviderUsage (may carry an error/unauthenticated status + empty meters)
  fetchUsage(): Promise<ProviderUsage | null>;
}
