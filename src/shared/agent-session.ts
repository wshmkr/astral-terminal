import { APP_PACKAGE_NAME } from "./meta";

export const AGENT_SESSION_OSC_IDENT = 778;

export type AgentSessionEvent = "start" | "update" | "end";

export interface AgentSession {
  agentName: string;
  sessionId: string;
  cwd?: string;
}

interface ParsedAgentSessionOsc extends AgentSession {
  event: AgentSessionEvent;
}

function decodeBase64Utf8(s: string): string | undefined {
  if (!s) return undefined;
  try {
    const decoded = Buffer.from(s, "base64").toString("utf-8");
    return decoded.length > 0 ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export function parseAgentSessionOsc(
  data: string,
): ParsedAgentSessionOsc | null {
  const parts = data.split(";");
  if (parts.length !== 3 && parts.length !== 4) return null;
  const [agentName, event, sessionId, cwdEncoded] = parts;
  if (!agentName || !sessionId) return null;
  if (event !== "start" && event !== "update" && event !== "end") return null;
  const cwd = cwdEncoded ? decodeBase64Utf8(cwdEncoded) : undefined;
  return { agentName, event, sessionId, cwd };
}

export function buildSessionHookShellCommand(opts: {
  agentName: string;
  event: AgentSessionEvent;
  extractSessionId: string;
  extractCwd: string;
  hookMarker: string;
}): string {
  const emit = `printf '\\033]${AGENT_SESSION_OSC_IDENT};${opts.agentName};${opts.event};%s;%s\\007' "$sid" "$cwdb64"`;
  const readInput = "in=$(cat)";
  const extractSid = `sid=$(printf '%s' "$in" | ${opts.extractSessionId})`;
  const extractCwd = `cwd=$(printf '%s' "$in" | ${opts.extractCwd})`;
  const encodeCwd = `cwdb64=$(printf '%s' "$cwd" | base64 | tr -d '\\n')`;
  return `: ${opts.hookMarker}; if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then ${readInput}; ${extractSid}; ${extractCwd}; ${encodeCwd}; [ -n "$sid" ] && ${emit} > /dev/tty; fi`;
}
