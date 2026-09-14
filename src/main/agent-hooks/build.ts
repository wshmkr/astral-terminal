import type { AgentName } from "../../shared/agent-hooks";
import { APP_PACKAGE_NAME } from "../../shared/meta";
import notifyScript from "./notify.sh?raw";
import { AGENT_SESSION_OSC_IDENT, type AgentSessionEvent } from "./osc";
import sanitizeScript from "./sanitize.sh?raw";
import sessionScript from "./session.sh?raw";
import stopScript from "./stop.sh?raw";

// Update marker version after any hook changes
export const HOOK_MARKER_VERSION = "5";

export const HOOK_MARKER_PREFIX = `${APP_PACKAGE_NAME}:hook`;
export const HOOK_MARKER = `${HOOK_MARKER_PREFIX}:v${HOOK_MARKER_VERSION}`;

function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
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

// Builds the body from a field in the hook's stdin JSON (e.g. the notification
// "message" or an AskUserQuestion "question"), falling back to a static string.
function notifyDynamicCommand(
  title: string,
  fallbackBody: string,
  field: string,
): string {
  return `: ${HOOK_MARKER}
if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then
NOTIFY_TITLE=${shellSingleQuote(title)}
NOTIFY_FALLBACK=${shellSingleQuote(fallbackBody)}
NOTIFY_FIELD=${shellSingleQuote(field)}
${sanitizeScript}
${notifyScript}
fi`;
}

// Summarizes Claude's final response by reading the Stop hook's transcript_path,
// falling back to a static string when no text is found.
function stopNotifyCommand(title: string, fallbackBody: string): string {
  return `: ${HOOK_MARKER}
if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then
NOTIFY_TITLE=${shellSingleQuote(title)}
NOTIFY_FALLBACK=${shellSingleQuote(fallbackBody)}
${sanitizeScript}
${stopScript}
fi`;
}

function notifyHook(entry: {
  title: string;
  body: string;
  field?: string;
  summary?: boolean;
}) {
  let command: string;
  if (entry.summary) command = stopNotifyCommand(entry.title, entry.body);
  else if (entry.field)
    command = notifyDynamicCommand(entry.title, entry.body, entry.field);
  else command = notifyDynamicCommand(entry.title, entry.body, "message");
  return { type: "command", command };
}

function sessionHook(agentName: string, event: AgentSessionEvent) {
  return { type: "command", command: sessionHookCommand(agentName, event) };
}

// Shared so an event reads identically in the panel whatever agent raised it
const permissionNotify = (agent: AgentName) => ({
  title: "Permission Needed",
  body: `${agent} needs tool approval`,
});

const readyNotify = (agent: AgentName) => ({
  title: "Ready for Input",
  body: `${agent} finished responding`,
});

type HooksConfig = { hooks: Record<string, unknown[]> };

const builders: Record<AgentName, (agent: AgentName) => HooksConfig> = {
  Claude: (agent) => {
    const session = (event: AgentSessionEvent) => sessionHook(agent, event);
    return {
      hooks: {
        Notification: [
          {
            matcher: "permission_prompt",
            // `message` carries Claude's own text, e.g. "Permission required to
            // execute: Bash(npm test)"; the static body is the fallback
            hooks: [
              notifyHook({ ...permissionNotify(agent), field: "message" }),
            ],
          },
          {
            matcher: "elicitation_dialog",
            hooks: [
              notifyHook({
                title: "Input Required",
                body: "An MCP server is requesting input",
                field: "message",
              }),
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: "AskUserQuestion",
            // `question` is the actual prompt text from AskUserQuestion's tool_input
            hooks: [
              notifyHook({
                title: "Question Pending",
                body: `${agent} is asking a question`,
                field: "question",
              }),
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: "EnterWorktree|ExitWorktree",
            hooks: [session("update")],
          },
        ],
        // Summary of the final assistant turn comes from the transcript
        Stop: [
          { hooks: [notifyHook({ ...readyNotify(agent), summary: true })] },
        ],
        SessionStart: [{ hooks: [session("start")] }],
        SessionEnd: [{ hooks: [session("end")] }],
      },
    };
  },
  Codex: (agent) => {
    const session = (event: AgentSessionEvent) => sessionHook(agent, event);
    return {
      hooks: {
        // Codex sends no message text here, so the body names the tool it wants
        PermissionRequest: [
          {
            hooks: [
              notifyHook({ ...permissionNotify(agent), field: "tool_name" }),
            ],
          },
        ],
        // Codex puts the final turn on the Stop payload, so no transcript read
        Stop: [
          {
            hooks: [
              notifyHook({
                ...readyNotify(agent),
                field: "last_assistant_message",
              }),
            ],
          },
        ],
        SessionStart: [{ hooks: [session("start")] }],
        SessionEnd: [{ hooks: [session("end")] }],
      },
    };
  },
};

export function buildAgentHooksConfig(name: string): HooksConfig {
  const agent = name as AgentName;
  const builder = builders[agent];
  if (!builder) throw new Error(`Unknown agent provider: ${name}`);
  return builder(agent);
}
