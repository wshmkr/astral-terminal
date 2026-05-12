import type { AgentName } from "../../shared/agent-hooks";
import { APP_PACKAGE_NAME } from "../../shared/meta";
import { AGENT_SESSION_OSC_IDENT, type AgentSessionEvent } from "./osc";
import sessionScript from "./session.sh?raw";

// Update marker version after any hook changes
export const HOOK_MARKER_VERSION = "4";

export const HOOK_MARKER_PREFIX = `${APP_PACKAGE_NAME}:hook`;
export const HOOK_MARKER = `${HOOK_MARKER_PREFIX}:v${HOOK_MARKER_VERSION}`;

function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function escapeInSingleQuotes(s: string): string {
  return s.replace(/'/g, "'\\''");
}

function oscNotifyCommand(title: string, body: string): string {
  const t = escapeInSingleQuotes(title);
  const b = escapeInSingleQuotes(body);
  const parentTty = `$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')`;
  return `: ${HOOK_MARKER}; if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then ptty=${parentTty}; [ -n "$ptty" ] && [ "$ptty" != "?" ] && printf '\\033]777;notify;${t};${b}\\007' > "/dev/$ptty"; fi`;
}

function sessionHookCommand(
  agentName: string,
  event: AgentSessionEvent,
): string {
  return `: ${HOOK_MARKER}
if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then
AGENT_OSC=${AGENT_SESSION_OSC_IDENT}
AGENT_NAME=${shellSingleQuote(agentName)}
AGENT_EVENT=${shellSingleQuote(event)}
${sessionScript}
fi`;
}

function notifyHook(entry: { title: string; body: string }) {
  return {
    type: "command",
    command: oscNotifyCommand(entry.title, entry.body),
  };
}

function sessionHook(agentName: string, event: AgentSessionEvent) {
  return { type: "command", command: sessionHookCommand(agentName, event) };
}

function agentHookStrings(agent: string) {
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

type HooksConfig = { hooks: Record<string, unknown[]> };

const builders: Record<AgentName, () => HooksConfig> = {
  Claude: () => {
    const s = agentHookStrings("Claude");
    const session = (event: AgentSessionEvent) => sessionHook("Claude", event);
    return {
      hooks: {
        Notification: [
          {
            matcher: "permission_prompt",
            hooks: [notifyHook(s.permissionPrompt)],
          },
          {
            matcher: "elicitation_dialog",
            hooks: [notifyHook(s.elicitationDialog)],
          },
        ],
        PreToolUse: [
          {
            matcher: "AskUserQuestion",
            hooks: [notifyHook(s.askUserQuestion)],
          },
        ],
        PostToolUse: [
          {
            matcher: "EnterWorktree|ExitWorktree",
            hooks: [session("update")],
          },
        ],
        Stop: [{ hooks: [notifyHook(s.stop)] }],
        SessionStart: [{ hooks: [session("start")] }],
        SessionEnd: [{ hooks: [session("end")] }],
      },
    };
  },
};

export function buildAgentHooksConfig(name: string): HooksConfig {
  const builder = builders[name as AgentName];
  if (!builder) throw new Error(`Unknown agent provider: ${name}`);
  return builder();
}
