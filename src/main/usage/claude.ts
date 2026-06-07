import fs from "node:fs/promises";
import type {
  ProviderUsage,
  UsageMeter,
  UsageStatus,
} from "../../shared/types";
import { resolveWslPath } from "../wsl/home";
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

// "absent" omits the provider; "unreadable" is transient → keep last-known
type CredentialsRead =
  | { state: "ok"; credentials: ClaudeCredentials }
  | { state: "absent" }
  | { state: "unreadable" };

// Won't recover mid-session, so latch it rather than respawn wsl.exe each poll
let wslHomeUnreachable = false;

async function readCredentials(): Promise<CredentialsRead> {
  if (wslHomeUnreachable) return { state: "absent" };
  let credPath: string;
  try {
    credPath = await credentialsPath();
  } catch {
    wslHomeUnreachable = true;
    return { state: "absent" };
  }
  let raw: string;
  try {
    raw = await fs.readFile(credPath, "utf-8");
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT")
      return { state: "absent" };
    return { state: "unreadable" };
  }
  if (!raw.trim()) return { state: "unreadable" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "unreadable" };
  }
  const oauth = (parsed as { claudeAiOauth?: Record<string, unknown> })
    ?.claudeAiOauth;
  const accessToken = oauth?.accessToken;
  if (typeof accessToken !== "string" || !accessToken)
    return { state: "absent" };
  const expiresAt =
    typeof oauth?.expiresAt === "number" ? oauth.expiresAt : null;
  return { state: "ok", credentials: { accessToken, expiresAt } };
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

function result(status: UsageStatus, meters: UsageMeter[]): ProviderUsage {
  return { provider: "Claude", status, meters };
}

async function fetchUsage(): Promise<ProviderUsage | null> {
  const creds = await readCredentials();
  if (creds.state === "absent") return null;
  if (creds.state === "unreadable") return result("stale", []);
  const { accessToken, expiresAt } = creds.credentials;
  if (expiresAt !== null && expiresAt < Date.now()) {
    return result("unauthenticated", []);
  }
  let res: Response;
  try {
    res = await fetch(USAGE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": CLAUDE_CODE_UA,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return result("stale", []);
  }
  if (res.status === 401) return result("unauthenticated", []);
  if (res.status === 429) return result("rate_limited", []);
  if (!res.ok) return result("stale", []);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return result("stale", []);
  }
  if (typeof body !== "object" || body === null) return result("stale", []);
  return result("ok", mapMeters(body as Record<string, RawWindow | null>));
}

export const claudeUsageAdapter: UsageProviderAdapter = {
  name: "Claude",
  fetchUsage,
};
