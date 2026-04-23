import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface WslHome {
  distro: string;
  linuxHome: string;
  uncHome: string;
}

let wslHomeCache: WslHome | null = null;

async function loadWslHome(): Promise<WslHome> {
  const { stdout } = await execFileAsync("wsl.exe", [
    "sh",
    "-c",
    "echo $WSL_DISTRO_NAME; echo $HOME",
  ]);
  const [distroRaw, homeRaw] = stdout.trim().split("\n");
  if (!distroRaw || !homeRaw) {
    throw new Error("Unable to resolve WSL distro name / home directory");
  }
  const distro = distroRaw.trim();
  const linuxHome = homeRaw.trim();
  const uncHome = `\\\\wsl$\\${distro}${linuxHome.replace(/\//g, "\\")}`;
  return { distro, linuxHome, uncHome };
}

async function getWslHome(): Promise<WslHome> {
  if (!wslHomeCache) wslHomeCache = await loadWslHome();
  return wslHomeCache;
}

export async function getWslDistro(): Promise<string> {
  return (await getWslHome()).distro;
}

export async function resolveWslHomePath(
  relativePath: string,
): Promise<string> {
  const isWindows = process.platform === "win32";
  if (!isWindows) return path.resolve(os.homedir(), ...relativePath.split("/"));
  const { uncHome } = await getWslHome();
  const resolved = path.resolve(uncHome, ...relativePath.split("/"));
  const root = path.resolve(uncHome);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing path outside WSL home: ${relativePath}`);
  }
  return resolved;
}

function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export async function toWslUncPath(linuxAbsPath: string): Promise<string> {
  if (!linuxAbsPath.startsWith("/") || hasControlChar(linuxAbsPath)) {
    throw new Error(`Not a safe absolute linux path: ${linuxAbsPath}`);
  }
  const { distro } = await getWslHome();
  return `\\\\wsl$\\${distro}${linuxAbsPath.replace(/\//g, "\\")}`;
}
