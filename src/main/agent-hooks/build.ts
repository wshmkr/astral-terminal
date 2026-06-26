import type { AgentName } from "../../shared/agent-hooks";
import { APP_PACKAGE_NAME } from "../../shared/meta";
import type { PaneStatusSignal } from "../../shared/types";
import { AGENT_SESSION_OSC_IDENT, type AgentSessionEvent } from "./osc";
import sessionScript from "./session.sh?raw";

// Update marker version after any hook changes
export const HOOK_MARKER_VERSION = "5";

export const HOOK_MARKER_PREFIX = `${APP_PACKAGE_NAME}:hook`;
export const HOOK_MARKER = `${HOOK_MARKER_PREFIX}:v${HOOK_MARKER_VERSION}`;

function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function escapeInSingleQuotes(s: string): string {
  return s.replace(/'/g, "'\\''");
}

// Resolves the agent pane's tty once and writes each OSC 777 payload to it.
// The renderer tags that pane from where the bytes arrive, so no session id
// is needed. Batching payloads keeps a single hook event to one `ps` fork.
function osc777Command(payloads: string[]): string {
  const parentTty = `$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')`;
  const writes = payloads
    .map((p) => `printf '\\033]777;${p}\\007' > "/dev/$ptty"`)
    .join("; ");
  return `: ${HOOK_MARKER}; if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then ptty=${parentTty}; if [ -n "$ptty" ] && [ "$ptty" != "?" ]; then ${writes}; fi; fi`;
}

function notifyPayload(title: string, body: string): string {
  return `notify;${escapeInSingleQuotes(title)};${escapeInSingleQuotes(body)}`;
}

function statusPayload(status: PaneStatusSignal): string {
  return `status;${status}`;
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

// Emits an OS notification and/or a pane status tag in a single command so an
// event resolves the tty (and forks `ps`) just once.
function eventHook(opts: {
  notify?: { title: string; body: string };
  status?: PaneStatusSignal;
}) {
  const payloads: string[] = [];
  if (opts.notify)
    payloads.push(notifyPayload(opts.notify.title, opts.notify.body));
  if (opts.status) payloads.push(statusPayload(opts.status));
  return { type: "command", command: osc777Command(payloads) };
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
            hooks: [
              eventHook({ notify: s.permissionPrompt, status: "needs-input" }),
            ],
          },
          {
            matcher: "elicitation_dialog",
            hooks: [
              eventHook({ notify: s.elicitationDialog, status: "needs-input" }),
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: "AskUserQuestion",
            hooks: [
              eventHook({ notify: s.askUserQuestion, status: "needs-input" }),
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: "EnterWorktree|ExitWorktree",
            hooks: [session("update")],
          },
        ],
        // A new prompt clears any pending tag; the agent is working again.
        UserPromptSubmit: [{ hooks: [eventHook({ status: "working" })] }],
        Stop: [
          {
            hooks: [eventHook({ notify: s.stop, status: "ready-for-review" })],
          },
        ],
        SessionStart: [
          { hooks: [session("start"), eventHook({ status: "working" })] },
        ],
        SessionEnd: [
          { hooks: [session("end"), eventHook({ status: "completed" })] },
        ],
      },
    };
  },
};

export function buildAgentHooksConfig(name: string): HooksConfig {
  const builder = builders[name as AgentName];
  if (!builder) throw new Error(`Unknown agent provider: ${name}`);
  return builder();
}
