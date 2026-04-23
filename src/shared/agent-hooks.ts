import { APP_PACKAGE_NAME } from "./meta";

// Update marker version after any hook changes
export const HOOK_MARKER_VERSION = "2";

export const CLAUDE_SESSION_OSC_IDENT = 1337;
export const CLAUDE_SESSION_OSC_PREFIX = "AstralClaudeSession=";
export const HOOK_MARKER_PREFIX = `${APP_PACKAGE_NAME}:hook`;
export const HOOK_MARKER = `${HOOK_MARKER_PREFIX}:v${HOOK_MARKER_VERSION}`;

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

function oscSessionCommand(event: "start" | "end"): string {
  const extract = `sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/p' | head -n 1`;
  const emit = `printf '\\033]${CLAUDE_SESSION_OSC_IDENT};${CLAUDE_SESSION_OSC_PREFIX}${event};%s\\007' "$sid"`;
  return `: ${HOOK_MARKER}; if [ "$TERM_PROGRAM" = "${APP_PACKAGE_NAME}" ]; then sid=$(${extract}); [ -n "$sid" ] && ${emit} > /dev/tty; fi`;
}

function sessionCmd(event: "start" | "end") {
  return { type: "command", command: oscSessionCommand(event) };
}

export interface AgentHookProvider {
  name: string;
  settingsPath: string;
  generateHooksConfig(): { hooks: Record<string, unknown[]> };
}

const claudeProvider: AgentHookProvider = {
  name: "Claude",
  settingsPath: ".claude/settings.json",

  generateHooksConfig() {
    const s = agentHookStrings(this.name);
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
        SessionStart: [{ hooks: [sessionCmd("start")] }],
        SessionEnd: [{ hooks: [sessionCmd("end")] }],
      },
    };
  },
};

export const agentProviders: AgentHookProvider[] = [claudeProvider];
