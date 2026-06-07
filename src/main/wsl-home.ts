import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const WSL_QUERY_TIMEOUT_MS = 5000;

async function getWslHomePath(): Promise<string> {
  const isWindows = process.platform === "win32";
  if (!isWindows) return os.homedir();
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      "wsl.exe",
      ["sh", "-c", "echo $WSL_DISTRO_NAME; echo $HOME"],
      { timeout: WSL_QUERY_TIMEOUT_MS },
    ));
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to query WSL home directory: ${reason}`);
  }
  const [distroRaw, wslHomeRaw] = stdout.trim().split("\n");
  if (!distroRaw || !wslHomeRaw) {
    throw new Error("Unable to resolve WSL distro name / home directory");
  }
  const distro = distroRaw.trim();
  const wslHome = wslHomeRaw.trim();
  return `\\\\wsl$\\${distro}${wslHome.replace(/\//g, "\\")}`;
}

let wslHomeCache: string | null = null;
let wslHomeCachePromise: Promise<string> | null = null;

export async function resolveWslPath(relativePath: string): Promise<string> {
  if (!wslHomeCache) {
    if (!wslHomeCachePromise) wslHomeCachePromise = getWslHomePath();
    try {
      wslHomeCache = await wslHomeCachePromise;
    } finally {
      wslHomeCachePromise = null;
    }
  }
  const resolved = path.resolve(wslHomeCache, ...relativePath.split("/"));
  const root = path.resolve(wslHomeCache);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing path outside WSL home: ${relativePath}`);
  }
  return resolved;
}
