import fs from "node:fs/promises";
import type {
  ProviderUsage,
  UsageMeter,
  UsageStatus,
} from "../../shared/types";
import { resolveWslPath } from "../wsl-home";
import type { UsageProviderAdapter } from "./types";

// Read-only on .credentials.json: token refresh is Claude Code's job, and rewriting
// the file here would race its rotation and could invalidate the user's login

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const CLAUDE_CODE_UA = "claude-code/2.0.0";
const FETCH_TIMEOUT_MS = 15_000;
const CREDENTIALS_RELATIVE = ".claude/.credentials.json";

interface ClaudeCredentials {
  accessToken: string;
  expiresAt: number | null;
}

interface RawWindow {
  utilization: number;
  resets_at: string;
}

function credentialsPath(): Promise<string> {
  return resolveWslPath(CREDENTIALS_RELATIVE);
}

async function readCredentials(): Promise<ClaudeCredentials | null> {
  let raw: string;
  try {
    raw = await fs.readFile(await credentialsPath(), "utf-8");
  } catch {
    return null;
  }
  if (!raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const oauth = (parsed as { claudeAiOauth?: Record<string, unknown> })
    ?.claudeAiOauth;
  const accessToken = oauth?.accessToken;
  if (typeof accessToken !== "string" || !accessToken) return null;
  const expiresAt =
    typeof oauth?.expiresAt === "number" ? oauth.expiresAt : null;
  return { accessToken, expiresAt };
}

function toMeter(
  id: string,
  label: string,
  raw: RawWindow | null | undefined,
): UsageMeter | null {
  if (!raw || typeof raw.utilization !== "number") return null;
  return {
    id,
    label,
    utilization: raw.utilization,
    resetsAt: raw.resets_at ?? null,
  };
}

function mapMeters(body: Record<string, RawWindow | null>): UsageMeter[] {
  return [
    toMeter("five_hour", "5h", body.five_hour),
    toMeter("seven_day", "Week", body.seven_day),
    toMeter("seven_day_opus", "Opus", body.seven_day_opus),
    toMeter("seven_day_sonnet", "Sonnet", body.seven_day_sonnet),
  ].filter((m): m is UsageMeter => m !== null);
}

function result(
  status: UsageStatus,
  meters: UsageMeter[],
  fetchedAt: number | null,
): ProviderUsage {
  return { provider: "Claude", status, meters, fetchedAt };
}

async function fetchUsage(): Promise<ProviderUsage | null> {
  const creds = await readCredentials();
  if (!creds) return null;
  if (creds.expiresAt !== null && creds.expiresAt < Date.now()) {
    return result("unauthenticated", [], null);
  }
  let res: Response;
  try {
    res = await fetch(USAGE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": CLAUDE_CODE_UA,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return result("stale", [], null);
  }
  if (res.status === 401) return result("unauthenticated", [], null);
  if (res.status === 429) return result("rate_limited", [], null);
  if (!res.ok) return result("stale", [], null);
  let body: Record<string, RawWindow | null>;
  try {
    body = (await res.json()) as Record<string, RawWindow | null>;
  } catch {
    return result("stale", [], null);
  }
  return result("ok", mapMeters(body), Date.now());
}

export const claudeUsageAdapter: UsageProviderAdapter = {
  name: "Claude",
  fetchUsage,
};
