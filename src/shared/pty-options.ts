import type { AppConfig } from "./types";

export function windowsPtyOptions(
  config: AppConfig,
): { backend: "conpty"; buildNumber?: number } | undefined {
  if (!config.platform.isWindows) return undefined;
  return { backend: "conpty", buildNumber: config.platform.windowsBuild };
}
