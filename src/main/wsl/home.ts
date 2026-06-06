import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function runWsl(
  args: string[],
  distro?: string | null,
): Promise<{ stdout: string; stderr: string }> {
  const distroArgs = distro ? ["-d", distro] : [];
  return execFileAsync("wsl.exe", [...distroArgs, ...args]);
}

// The app reaches the WSL guest filesystem through the \\wsl$\<distro> UNC share.
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

const wslHomeCache = new Map<string, string>();

export async function resolveWslPath(
  relativePath: string,
  distro?: string | null,
): Promise<string> {
  const key = distro ?? "";
  let home = wslHomeCache.get(key);
  if (!home) {
    home = await getWslHomePath(distro);
    wslHomeCache.set(key, home);
  }
  const resolved = path.resolve(home, ...relativePath.split("/"));
  const root = path.resolve(home);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing path outside WSL home: ${relativePath}`);
  }
  return resolved;
}
