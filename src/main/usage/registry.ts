import { claudeUsageAdapter } from "./claude";
import type { UsageProviderAdapter } from "./types";

export const usageAdapters: UsageProviderAdapter[] = [claudeUsageAdapter];
