import { APP_PACKAGE_NAME } from "./meta";

export const AGENT_SESSION_OSC_IDENT = 778;
const AGENT_SESSION_OSC_PREFIX = "AgentSession=";

export type AgentSessionEvent = "start" | "end";

interface ParsedAgentSessionOsc {
  agentName: string;
  event: AgentSessionEvent;
  sessionId: string;
}

export function parseAgentSessionOsc(
  data: string,
): ParsedAgentSessionOsc | null {
  if (!data.startsWith(AGENT_SESSION_OSC_PREFIX)) return null;
  const parts = data.slice(AGENT_SESSION_OSC_PREFIX.length).split(";");
  if (parts.length !== 3) return null;
  const [agentName, event, sessionId] = parts;
  if (!agentName || !sessionId) return null;
  if (event !== "start" && event !== "end") return null;
  return { agentName, event, sessionId };
}

export function buildSessionHookShellCommand(opts: {
  agentName: string;
  event: AgentSessionEvent;
  extractSessionId: string;
  hookMarker: string;
}): string {
  const emit = `printf '\\033]${AGENT_SESSION_OSC_IDENT};${AGENT_SESSION_OSC_PREFIX}${opts.agentName};${opts.event};%s\\007' "$sid"`;
  return `: ${opts.hookMarker}; if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then sid=$(${opts.extractSessionId}); [ -n "$sid" ] && ${emit} > /dev/tty; fi`;
}
