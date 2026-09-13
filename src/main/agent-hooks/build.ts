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

// Shared so the same event reads identically in the panel whatever agent raised it
const NOTIFY_TITLE = {
  permission: "Permission Needed",
  input: "Input Required",
  ready: "Ready for Input",
  question: "Question Pending",
} as const;

function claudeHookStrings(agent: string) {
  return {
    // `message` carries Claude's own text, e.g. "Permission required to
    // execute: Bash(npm test)"; the static body is the fallback.
    permissionPrompt: {
      title: NOTIFY_TITLE.permission,
      body: `${agent} needs tool approval`,
      field: "message",
    },
    elicitationDialog: {
      title: NOTIFY_TITLE.input,
      body: "An MCP server is requesting input",
      field: "message",
    },
    // Summary of the final assistant turn comes from the transcript.
    stop: {
      title: NOTIFY_TITLE.ready,
      body: `${agent} finished responding`,
      summary: true,
    },
    // `question` is the actual prompt text from AskUserQuestion's tool_input.
    askUserQuestion: {
      title: NOTIFY_TITLE.question,
      body: `${agent} is asking a question`,
      field: "question",
    },
  };
}

function codexHookStrings(agent: string) {
  return {
    // Codex has no message text on PermissionRequest, so the body names the
    // tool it wants to run, e.g. "shell".
    permissionRequest: {
      title: NOTIFY_TITLE.permission,
      body: `${agent} needs tool approval`,
      field: "tool_name",
    },
    // Codex puts the final turn on the Stop payload, so no transcript read.
    stop: {
      title: NOTIFY_TITLE.ready,
      body: `${agent} finished responding`,
      field: "last_assistant_message",
    },
  };
}

type HooksConfig = { hooks: Record<string, unknown[]> };

const builders: Record<AgentName, () => HooksConfig> = {
  Claude: () => {
    const s = claudeHookStrings("Claude");
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
  Codex: () => {
    const s = codexHookStrings("Codex");
    const session = (event: AgentSessionEvent) => sessionHook("Codex", event);
    return {
      hooks: {
        PermissionRequest: [{ hooks: [notifyHook(s.permissionRequest)] }],
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
