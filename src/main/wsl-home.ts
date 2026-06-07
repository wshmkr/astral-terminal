import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function getWslHomePath(): Promise<string> {
  const isWindows = process.platform === "win32";
  if (!isWindows) return os.homedir();
  const { stdout } = await execFileAsync("wsl.exe", [
    "sh",
    "-c",
    "echo $WSL_DISTRO_NAME; echo $HOME",
  ]);
  const [distroRaw, wslHomeRaw] = stdout.trim().split("\n");
  if (!distroRaw || !wslHomeRaw) {
    throw new Error("Unable to resolve WSL distro name / home directory");
  }
  const distro = distroRaw.trim();
  const wslHome = wslHomeRaw.trim();
  return `\\\\wsl$\\${distro}${wslHome.replace(/\//g, "\\")}`;
}

let wslHomeCache: string | null = null;

export async function resolveWslPath(relativePath: string): Promise<string> {
  if (!wslHomeCache) wslHomeCache = await getWslHomePath();
  const resolved = path.resolve(wslHomeCache, ...relativePath.split("/"));
  const root = path.resolve(wslHomeCache);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing path outside WSL home: ${relativePath}`);
  }
  return resolved;
}
