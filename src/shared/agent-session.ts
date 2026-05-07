import sessionScript from "./hooks/agent-session.sh?raw";
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

export function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export function buildSessionHookShellCommand(opts: {
  agentName: string;
  event: AgentSessionEvent;
  hookMarker: string;
}): string {
  return `: ${opts.hookMarker}
if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then
AGENT_OSC=${AGENT_SESSION_OSC_IDENT}
AGENT_NAME=${shellSingleQuote(opts.agentName)}
AGENT_EVENT=${shellSingleQuote(opts.event)}
${sessionScript}
fi`;
}
