import os from "node:os";
import type { AppConfig } from "../shared/types";

function detectPlatform(): AppConfig["platform"] {
  const isWindows = process.platform === "win32";
  if (!isWindows) return { isWindows };
  const build = parseInt(os.release().split(".")[2] ?? "", 10);
  return {
    isWindows,
    windowsBuild: Number.isFinite(build) ? build : undefined,
  };
}

export function loadConfig(): AppConfig {
  return { platform: detectPlatform() };
}
