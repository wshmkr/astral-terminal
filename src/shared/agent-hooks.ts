import {
  type AgentSessionEvent,
  buildSessionHookShellCommand,
} from "./agent-session";
import { APP_PACKAGE_NAME } from "./meta";

// Update marker version after any hook changes
export const HOOK_MARKER_VERSION = "2";

export const HOOK_MARKER_PREFIX = `${APP_PACKAGE_NAME}:hook`;
export const HOOK_MARKER = `${HOOK_MARKER_PREFIX}:v${HOOK_MARKER_VERSION}`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// sed extractor for Claude hook stdin JSON (expects top-level "session_id")
const CLAUDE_SESSION_ID_EXTRACTOR = `sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/p' | head -n 1`;

export function agentHookStrings(agent: string) {
  return {
    permissionPrompt: {
      title: "Permission Needed",
      body: `${agent} needs tool approval`,
    },
    elicitationDialog: {
      title: "Input Required",
      body: "An MCP server is requesting input",
    },
    stop: { title: "Ready for Input", body: `${agent} finished responding` },
    askUserQuestion: {
      title: "Question Pending",
      body: `${agent} is asking a question`,
    },
  };
}

function shellSingleQuote(s: string): string {
  return s.replace(/'/g, "'\\''");
}

function oscNotifyCommand(title: string, body: string): string {
  const t = shellSingleQuote(title);
  const b = shellSingleQuote(body);
  return `: ${HOOK_MARKER}; if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then printf '\\033]777;notify;${t};${b}\\007' > /dev/tty; fi`;
}

function cmd(entry: { title: string; body: string }) {
  return {
    type: "command",
    command: oscNotifyCommand(entry.title, entry.body),
  };
}

function sessionCmd(opts: {
  agentId: string;
  event: AgentSessionEvent;
  extractSessionId: string;
}) {
  return {
    type: "command",
    command: buildSessionHookShellCommand({
      ...opts,
      hookMarker: HOOK_MARKER,
    }),
  };
}

export interface AgentHookProvider {
  id: string;
  name: string;
  settingsPath: string;
  sessionIdPattern: RegExp;
  resumeCommand(sessionId: string): string;
  generateHooksConfig(): { hooks: Record<string, unknown[]> };
}

const claudeProvider: AgentHookProvider = {
  id: "claude",
  name: "Claude",
  settingsPath: ".claude/settings.json",
  sessionIdPattern: UUID_RE,
  resumeCommand(sessionId) {
    return `claude --resume ${sessionId}`;
  },

  generateHooksConfig() {
    const s = agentHookStrings(this.name);
    const session = (event: AgentSessionEvent) =>
      sessionCmd({
        agentId: this.id,
        event,
        extractSessionId: CLAUDE_SESSION_ID_EXTRACTOR,
      });
    return {
      hooks: {
        Notification: [
          { matcher: "permission_prompt", hooks: [cmd(s.permissionPrompt)] },
          { matcher: "elicitation_dialog", hooks: [cmd(s.elicitationDialog)] },
        ],
        PreToolUse: [
          { matcher: "AskUserQuestion", hooks: [cmd(s.askUserQuestion)] },
        ],
        Stop: [{ hooks: [cmd(s.stop)] }],
        SessionStart: [{ hooks: [session("start")] }],
        SessionEnd: [{ hooks: [session("end")] }],
      },
    };
  },
};

export const agentProviders: AgentHookProvider[] = [claudeProvider];

export function findAgentProvider(id: string): AgentHookProvider | undefined {
  return agentProviders.find((p) => p.id === id);
}

export function resumeCommandFor(
  session: { agentId: string; sessionId: string } | undefined,
): string | undefined {
  if (!session) return undefined;
  const provider = findAgentProvider(session.agentId);
  if (!provider) return undefined;
  if (!provider.sessionIdPattern.test(session.sessionId)) return undefined;
  return provider.resumeCommand(session.sessionId);
}
