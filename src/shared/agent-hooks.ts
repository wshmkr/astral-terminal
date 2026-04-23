import { APP_PACKAGE_NAME } from "./meta";

// Update marker version after any hook changes
export const HOOK_MARKER_VERSION = "1";
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
      },
    };
  },
};

export const agentProviders: AgentHookProvider[] = [claudeProvider];
