import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  type AgentHookProvider,
  findAgentProvider,
  HOOK_MARKER,
  HOOK_MARKER_PREFIX,
  HOOK_MARKER_VERSION,
} from "../shared/agent-hooks";
import type {
  ConfigureAgentHooksResult,
  UninstallAgentHooksResult,
} from "../shared/types";

const pathLocks = new Map<string, Promise<unknown>>();
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

async function resolveWslPath(relativePath: string): Promise<string> {
  if (!wslHomeCache) wslHomeCache = await getWslHomePath();
  const resolved = path.resolve(wslHomeCache, ...relativePath.split("/"));
  const root = path.resolve(wslHomeCache);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing path outside WSL home: ${relativePath}`);
  }
  return resolved;
}

export async function detectAgentHooks(providerName: string): Promise<boolean> {
  const provider = findAgentProvider(providerName);
  if (!provider) return false;
  try {
    const dir = await resolveWslPath(path.posix.dirname(provider.settingsPath));
    return await fs.stat(dir).then(
      () => true,
      () => false,
    );
  } catch (err) {
    console.error("detectAgentHooks failed:", err);
    return false;
  }
}

function isOwnHookCommand(value: unknown): boolean {
  return typeof value === "string" && value.includes(HOOK_MARKER_PREFIX);
}

function isCurrentHookCommand(value: unknown): boolean {
  return typeof value === "string" && value.includes(HOOK_MARKER);
}

function extractHookVersion(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const i = value.indexOf(HOOK_MARKER_PREFIX);
  if (i < 0) return null;
  const match = value.slice(i + HOOK_MARKER_PREFIX.length).match(/^:v(\d+)/);
  return match ? Number(match[1]) : null;
}

function collectHookVersions(node: unknown, out: Set<number>): void {
  if (Array.isArray(node)) {
    for (const n of node) collectHookVersions(n, out);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const v = extractHookVersion(obj.command);
    if (v !== null) out.add(v);
    for (const n of Object.values(obj)) collectHookVersions(n, out);
  }
}

function hookTreeHas(
  node: unknown,
  predicate: (value: unknown) => boolean,
): boolean {
  if (Array.isArray(node)) return node.some((n) => hookTreeHas(n, predicate));
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (predicate(obj.command)) return true;
    return Object.values(obj).some((n) => hookTreeHas(n, predicate));
  }
  return false;
}

function countHookCommands(
  node: unknown,
  predicate: (value: unknown) => boolean,
): number {
  if (Array.isArray(node))
    return node.reduce<number>(
      (n, x) => n + countHookCommands(x, predicate),
      0,
    );
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    let n = predicate(obj.command) ? 1 : 0;
    for (const child of Object.values(obj))
      n += countHookCommands(child, predicate);
    return n;
  }
  return 0;
}

function purgeOwnHooks(
  hooks: Record<string, unknown[]>,
): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = {};
  for (const [event, eventHooks] of Object.entries(hooks)) {
    if (!Array.isArray(eventHooks)) {
      result[event] = eventHooks;
      continue;
    }
    const kept: unknown[] = [];
    for (const entry of eventHooks) {
      if (!entry || typeof entry !== "object") {
        kept.push(entry);
        continue;
      }
      const e = entry as Record<string, unknown>;
      if (Array.isArray(e.hooks)) {
        const filtered = (e.hooks as unknown[]).filter((h) => {
          const cmd =
            h && typeof h === "object"
              ? (h as Record<string, unknown>).command
              : undefined;
          return !isOwnHookCommand(cmd);
        });
        if (filtered.length === 0) continue;
        kept.push({ ...e, hooks: filtered });
      } else if (isOwnHookCommand(e.command)) {
      } else {
        kept.push(entry);
      }
    }
    if (kept.length > 0) result[event] = kept;
  }
  return result;
}

async function runConfigure(
  provider: AgentHookProvider,
): Promise<ConfigureAgentHooksResult> {
  const { settingsPath } = provider;
  try {
    const filePath = await resolveWslPath(settingsPath);

    let settings: Record<string, unknown> = {};
    let raw: string | null = null;
    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    if (raw?.trim()) settings = JSON.parse(raw);

    const existing =
      (settings.hooks as Record<string, unknown[]> | undefined) ?? {};
    const hasCurrent = hookTreeHas(existing, isCurrentHookCommand);
    const hasStale = hookTreeHas(
      existing,
      (v) => isOwnHookCommand(v) && !isCurrentHookCommand(v),
    );
    const { hooks } = provider.generateHooksConfig();
    const expectedCount = countHookCommands(hooks, isCurrentHookCommand);
    const currentCount = countHookCommands(existing, isCurrentHookCommand);

    if (hasCurrent && !hasStale && currentCount === expectedCount) {
      return { status: "already-configured" };
    }

    if (hasStale) {
      const versions = new Set<number>();
      collectHookVersions(existing, versions);
      const current = Number(HOOK_MARKER_VERSION);
      const maxExisting = versions.size > 0 ? Math.max(...versions) : current;
      if (maxExisting > current) {
        console.warn(
          `Downgrading agent hooks in ~/${settingsPath}: v${maxExisting} → v${current}`,
        );
      }
    }
    const base = hasStale || hasCurrent ? purgeOwnHooks(existing) : existing;
    const merged: Record<string, unknown[]> = { ...base };
    for (const [event, eventHooks] of Object.entries(hooks)) {
      merged[event] = [...(merged[event] || []), ...eventHooks];
    }
    settings.hooks = merged;

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), "utf-8");

    console.log(`Installed notification hooks in ~/${settingsPath}`);
    return { status: "configured" };
  } catch (err) {
    console.error("Failed to configure agent hooks:", err);
    return { status: "error", message: String(err) };
  }
}

export async function configureAgentHooks(
  providerName: string,
): Promise<ConfigureAgentHooksResult> {
  const provider = findAgentProvider(providerName);
  if (!provider)
    return {
      status: "error",
      message: `Unknown agent provider: ${providerName}`,
    };
  const key = provider.settingsPath;
  const prev = pathLocks.get(key) ?? Promise.resolve();
  const next = prev.then(
    () => runConfigure(provider),
    () => runConfigure(provider),
  );
  pathLocks.set(
    key,
    next.catch(() => {}),
  );
  return next;
}

async function runUninstall(
  provider: AgentHookProvider,
): Promise<UninstallAgentHooksResult> {
  const { settingsPath } = provider;
  try {
    const filePath = await resolveWslPath(settingsPath);

    let raw: string | null = null;
    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return { status: "not-installed" };
      }
      throw err;
    }
    if (!raw?.trim()) return { status: "not-installed" };

    const settings = JSON.parse(raw) as Record<string, unknown>;
    const existing =
      (settings.hooks as Record<string, unknown[]> | undefined) ?? {};
    if (!hookTreeHas(existing, isOwnHookCommand)) {
      return { status: "not-installed" };
    }

    const purged = purgeOwnHooks(existing);
    if (Object.keys(purged).length === 0) {
      delete settings.hooks;
    } else {
      settings.hooks = purged;
    }
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), "utf-8");

    console.log(`Removed notification hooks from ~/${settingsPath}`);
    return { status: "uninstalled" };
  } catch (err) {
    console.error("Failed to uninstall agent hooks:", err);
    return { status: "error", message: String(err) };
  }
}

export async function uninstallAgentHooks(
  providerName: string,
): Promise<UninstallAgentHooksResult> {
  const provider = findAgentProvider(providerName);
  if (!provider)
    return {
      status: "error",
      message: `Unknown agent provider: ${providerName}`,
    };
  const key = provider.settingsPath;
  const prev = pathLocks.get(key) ?? Promise.resolve();
  const next = prev.then(
    () => runUninstall(provider),
    () => runUninstall(provider),
  );
  pathLocks.set(
    key,
    next.catch(() => {}),
  );
  return next;
}
