import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { WslDistro } from "../shared/types";
import { WSL_COMMAND_TIMEOUT_MS } from "./wsl/home";

const execFileAsync = promisify(execFile);

// docker-desktop / rancher-desktop / podman register helper distros that
// users don't want as their shell. They typically lack a login shell anyway.
const SYSTEM_DISTROS: ReadonlySet<string> = new Set([
  "docker-desktop",
  "docker-desktop-data",
  "rancher-desktop",
  "rancher-desktop-data",
  "podman-machine-default",
]);

export function isSystemWslDistro(name: string): boolean {
  return SYSTEM_DISTROS.has(name);
}

function parseWslListOutput(stdout: string): WslDistro[] {
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.replace(/\0/g, "").trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  // Drop the localized header row.
  const rows = lines.slice(1);
  const distros: WslDistro[] = [];
  for (const row of rows) {
    const isDefault = row.trimStart().startsWith("*");
    const cleaned = row.replace(/^\s*\*?\s*/, "");
    const cols = cleaned.split(/\s+/);
    if (cols.length < 1) continue;
    const name = cols[0];
    if (!name) continue;
    const versionRaw = cols[2];
    const version = versionRaw ? Number.parseInt(versionRaw, 10) : Number.NaN;
    distros.push({
      name,
      isDefault,
      isSystem: isSystemWslDistro(name),
      version: Number.isFinite(version) ? version : null,
    });
  }
  return distros;
}

export async function listWslDistros(): Promise<WslDistro[]> {
  if (process.platform !== "win32") return [];
  try {
    const { stdout } = await execFileAsync("wsl.exe", ["-l", "-v"], {
      encoding: "buffer",
      windowsHide: true,
      timeout: WSL_COMMAND_TIMEOUT_MS,
    });
    const decoded = Buffer.from(stdout).toString("utf16le");
    return parseWslListOutput(decoded);
  } catch (err) {
    console.error("listWslDistros failed:", err);
    return [];
  }
}
