import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface SocketLocation {
  path: string;
  dir: string | null;
  isPipe: boolean;
}

export function resolveSocketPath(): SocketLocation {
  if (process.platform === "win32") {
    return {
      path: `\\\\.\\pipe\\astral-${process.pid}`,
      dir: null,
      isPipe: true,
    };
  }
  const xdg = process.env.XDG_RUNTIME_DIR;
  if (xdg && isWritableDir(xdg)) {
    const dir = path.join(xdg, "astral");
    return { path: path.join(dir, `${process.pid}.sock`), dir, isPipe: false };
  }
  const uid =
    typeof process.getuid === "function" ? process.getuid() : os.userInfo().uid;
  return {
    path: path.join(os.tmpdir(), `astral-${uid}-${process.pid}.sock`),
    dir: null,
    isPipe: false,
  };
}

function isWritableDir(dir: string): boolean {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

export function ensureSocketDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function unlinkSocketIfExists(socketPath: string): void {
  try {
    fs.unlinkSync(socketPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
