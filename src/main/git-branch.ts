import fs from "node:fs/promises";
import path from "node:path";
import { toWslUncPath } from "./wsl-path";

const READ_TIMEOUT_MS = 1000;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const REF_PATTERN = /^ref:\s+refs\/heads\/(.+)$/;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("git read timeout")), ms),
    ),
  ]);
}

async function readGitDir(dotGitPath: string): Promise<string | undefined> {
  const stat = await fs.stat(dotGitPath);
  if (stat.isDirectory()) return dotGitPath;
  if (!stat.isFile()) return undefined;
  const content = await fs.readFile(dotGitPath, "utf-8");
  const match = content.match(/^gitdir:\s+(.+)$/m);
  if (!match?.[1]) return undefined;
  const target = match[1].trim();
  if (path.isAbsolute(target)) {
    return target.startsWith("/") ? toWslUncPath(target) : target;
  }
  return path.resolve(path.dirname(dotGitPath), target);
}

function parseHead(content: string): string | undefined {
  const line = content.trim();
  const refMatch = line.match(REF_PATTERN);
  if (refMatch?.[1]) return refMatch[1];
  if (SHA_PATTERN.test(line)) return `@${line.slice(0, 7)}`;
  return undefined;
}

export async function getGitBranch(
  linuxCwd: string,
): Promise<string | undefined> {
  try {
    const uncCwd = await toWslUncPath(linuxCwd);
    const run = async () => {
      const gitDir = await readGitDir(path.join(uncCwd, ".git"));
      if (!gitDir) return undefined;
      const head = await fs.readFile(path.join(gitDir, "HEAD"), "utf-8");
      return parseHead(head);
    };
    return await withTimeout(run(), READ_TIMEOUT_MS);
  } catch {
    return undefined;
  }
}
