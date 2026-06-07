import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Cap hung wsl.exe calls; 30s allows a cold-start distro boot
export const WSL_COMMAND_TIMEOUT_MS = 30_000;

export function runWsl(
  args: string[],
  distro?: string | null,
): Promise<{ stdout: string; stderr: string }> {
  const distroArgs = distro ? ["-d", distro] : [];
  return execFileAsync("wsl.exe", [...distroArgs, ...args], {
    timeout: WSL_COMMAND_TIMEOUT_MS,
  });
}

// Reach the WSL guest fs via the \\wsl$\<distro> UNC share
// TODO(native): on non-Windows the guest is the host, so this is just os.homedir()
async function getWslHomePath(distro?: string | null): Promise<string> {
  if (process.platform !== "win32") return os.homedir();
  const { stdout } = await runWsl(
    ["sh", "-c", "echo $WSL_DISTRO_NAME; echo $HOME"],
    distro,
  );
  const [distroRaw, wslHomeRaw] = stdout.trim().split("\n");
  if (!distroRaw || !wslHomeRaw) {
    throw new Error("Unable to resolve WSL distro name / home directory");
  }
  return `\\\\wsl$\\${distroRaw.trim()}${wslHomeRaw.trim().replace(/\//g, "\\")}`;
}

// Memoize the in-flight lookup so concurrent cold-start callers share one round-trip
const wslHomeCache = new Map<string, Promise<string>>();

export async function resolveWslPath(
  relativePath: string,
  distro?: string | null,
): Promise<string> {
  const key = distro ?? "";
  let homePromise = wslHomeCache.get(key);
  if (!homePromise) {
    homePromise = getWslHomePath(distro);
    wslHomeCache.set(key, homePromise);
    homePromise.catch(() => wslHomeCache.delete(key));
  }
  const home = await homePromise;
  const resolved = path.resolve(home, ...relativePath.split("/"));
  const root = path.resolve(home);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing path outside WSL home: ${relativePath}`);
  }
  return resolved;
}
