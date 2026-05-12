const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AgentHookStatus = "installed" | "stale" | "missing";

export function isAgentHookInstalled(status: AgentHookStatus | undefined) {
  return status === "installed" || status === "stale";
}

export interface AgentHookProvider<N extends string = string> {
  name: N;
  settingsPath: string;
  sessionIdPattern: RegExp;
  resumeCommand(sessionId: string): string;
}

const claudeProvider: AgentHookProvider<"Claude"> = {
  name: "Claude",
  settingsPath: ".claude/settings.json",
  sessionIdPattern: UUID_RE,
  resumeCommand(sessionId) {
    return `claude --resume ${sessionId}`;
  },
};

export const agentProviders = [claudeProvider] as const;

export type AgentName = (typeof agentProviders)[number]["name"];

export function findAgentProvider(name: string): AgentHookProvider | undefined {
  return agentProviders.find((p) => p.name === name);
}
