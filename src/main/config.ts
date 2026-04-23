import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";
import { type AppConfig, DEFAULT_TERMINAL_THEME } from "../shared/types";

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

function detectPlatform(): AppConfig["platform"] {
  const isWindows = process.platform === "win32";
  if (!isWindows) return { isWindows };
  // os.release() on Windows 10/11 returns "10.0.<build>"
  const build = parseInt(os.release().split(".")[2] ?? "", 10);
  return {
    isWindows,
    windowsBuild: Number.isFinite(build) ? build : undefined,
  };
}

export function loadConfig(): AppConfig {
  const platform = detectPlatform();
  try {
    const raw = fs.readFileSync(getConfigPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      terminalTheme: { ...DEFAULT_TERMINAL_THEME, ...parsed.terminalTheme },
      platform,
    };
  } catch {
    return { terminalTheme: DEFAULT_TERMINAL_THEME, platform };
  }
}
