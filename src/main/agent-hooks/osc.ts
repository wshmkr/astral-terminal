import { findAgentProvider } from "../../shared/agent-hooks";

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
  try {
    const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes) || undefined;
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

export function resumeCommandFor(
  session: AgentSession | undefined,
): string | undefined {
  if (!session) return undefined;
  const provider = findAgentProvider(session.agentName);
  if (!provider) return undefined;
  if (!provider.sessionIdPattern.test(session.sessionId)) return undefined;
  return provider.resumeCommand(session.sessionId);
}
