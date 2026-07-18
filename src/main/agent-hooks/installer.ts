import fs from "node:fs/promises";
import path from "node:path";
import {
  type AgentHookProvider,
  type AgentHookStatus,
  findAgentProvider,
} from "../../shared/agent-hooks";
import {
  compareVersions,
  parseMarkerVersion,
} from "../../shared/marker-version";
import type {
  ConfigureAgentHooksResult,
  UninstallAgentHooksResult,
} from "../../shared/types";
import { writeFileAtomic } from "../atomic-file";
import { withKeyedLock } from "../keyed-lock";
import { resolveWslPath } from "../wsl/home";
import {
  buildAgentHooksConfig,
  HOOK_MARKER,
  HOOK_MARKER_PREFIX,
  HOOK_MARKER_VERSION,
} from "./build";

const settingsFileLocks = new Map<string, Promise<unknown>>();

// This rewrites the user's own agent settings file (often over a \\wsl$ UNC
// share); write-then-rename so a crash mid-write can't truncate it.
function writeSettingsAtomic(
  filePath: string,
  settings: Record<string, unknown>,
): Promise<void> {
  return writeFileAtomic(filePath, JSON.stringify(settings, null, 2));
}

function isOwnHookCommand(value: unknown): boolean {
  return typeof value === "string" && value.includes(HOOK_MARKER_PREFIX);
}

function isCurrentHookCommand(value: unknown): boolean {
  return typeof value === "string" && value.includes(HOOK_MARKER);
}

function extractHookVersion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return parseMarkerVersion(value, HOOK_MARKER_PREFIX);
}

function collectHookVersions(node: unknown, out: Set<string>): void {
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
      } else if (!isOwnHookCommand(e.command)) {
        kept.push(entry);
      }
    }
    if (kept.length > 0) result[event] = kept;
  }
  return result;
}

interface ParsedSettings {
  settings: Record<string, unknown>;
  hooks: Record<string, unknown[]>;
}

async function readSettings(filePath: string): Promise<ParsedSettings | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  if (!raw.trim()) return null;
  const settings = JSON.parse(raw) as Record<string, unknown>;
  const hooks = (settings.hooks as Record<string, unknown[]> | undefined) ?? {};
  return { settings, hooks };
}

async function runConfigure(
  provider: AgentHookProvider,
): Promise<ConfigureAgentHooksResult> {
  const { settingsPath } = provider;
  try {
    const filePath = await resolveWslPath(settingsPath);
    const dir = path.dirname(filePath);
    const dirExists = await fs.access(dir).then(
      () => true,
      () => false,
    );
    if (!dirExists) {
      return {
        status: "error",
        message: `${provider.name} is not installed (~/${path.posix.dirname(settingsPath)} not found)`,
      };
    }
    const parsed = (await readSettings(filePath)) ?? {
      settings: {},
      hooks: {},
    };
    const { settings, hooks: existing } = parsed;
    const hasCurrent = hookTreeHas(existing, isCurrentHookCommand);
    const hasStale = hookTreeHas(
      existing,
      (v) => isOwnHookCommand(v) && !isCurrentHookCommand(v),
    );
    const { hooks } = buildAgentHooksConfig(provider.name);
    const expectedCount = countHookCommands(hooks, isCurrentHookCommand);
    const currentCount = countHookCommands(existing, isCurrentHookCommand);

    if (hasCurrent && !hasStale && currentCount === expectedCount) {
      return { status: "already-configured" };
    }

    if (hasStale) {
      const versions = new Set<string>();
      collectHookVersions(existing, versions);
      const maxExisting = [...versions].reduce(
        (max, v) => (compareVersions(v, max) > 0 ? v : max),
        HOOK_MARKER_VERSION,
      );
      if (compareVersions(maxExisting, HOOK_MARKER_VERSION) > 0) {
        console.warn(
          `Downgrading agent hooks in ~/${settingsPath}: v${maxExisting} → v${HOOK_MARKER_VERSION}`,
        );
      }
    }
    const base = hasStale || hasCurrent ? purgeOwnHooks(existing) : existing;
    const merged: Record<string, unknown[]> = { ...base };
    for (const [event, eventHooks] of Object.entries(hooks)) {
      merged[event] = [...(merged[event] || []), ...eventHooks];
    }
    settings.hooks = merged;

    await writeSettingsAtomic(filePath, settings);

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
  return withKeyedLock(settingsFileLocks, provider.settingsPath, () =>
    runConfigure(provider),
  );
}

async function runUninstall(
  provider: AgentHookProvider,
): Promise<UninstallAgentHooksResult> {
  const { settingsPath } = provider;
  try {
    const filePath = await resolveWslPath(settingsPath);
    const parsed = await readSettings(filePath);
    if (!parsed) return { status: "not-installed" };
    const { settings, hooks: existing } = parsed;
    if (!hookTreeHas(existing, isOwnHookCommand)) {
      return { status: "not-installed" };
    }

    const purged = purgeOwnHooks(existing);
    if (Object.keys(purged).length === 0) {
      delete settings.hooks;
    } else {
      settings.hooks = purged;
    }
    await writeSettingsAtomic(filePath, settings);

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
  return withKeyedLock(settingsFileLocks, provider.settingsPath, () =>
    runUninstall(provider),
  );
}

export async function getAgentHookStatus(
  providerName: string,
): Promise<AgentHookStatus> {
  const provider = findAgentProvider(providerName);
  if (!provider) return "missing";
  try {
    const filePath = await resolveWslPath(provider.settingsPath);
    const parsed = await readSettings(filePath);
    if (!parsed) return "missing";
    const { hooks: existing } = parsed;
    if (!hookTreeHas(existing, isOwnHookCommand)) return "missing";
    if (!hookTreeHas(existing, isCurrentHookCommand)) return "stale";
    const { hooks } = buildAgentHooksConfig(provider.name);
    const expected = countHookCommands(hooks, isCurrentHookCommand);
    const actual = countHookCommands(existing, isCurrentHookCommand);
    return actual === expected ? "installed" : "stale";
  } catch (err) {
    console.warn(`Failed to read agent hook status for ${providerName}:`, err);
    return "missing";
  }
}
