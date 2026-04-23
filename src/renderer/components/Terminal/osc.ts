// biome-ignore lint/suspicious/noControlCharactersInRegex: OSC sequences use ESC and BEL
const OSC_PATTERN = /\x1b\](\d+);([^\x07\x1b]*?)(?:\x07|\x1b\\)/g;

const OSC_TITLE_ICON = "0";
const OSC_TITLE = "2";
const OSC_CWD = "7";
const OSC_RXVT_NOTIFY = "777";

export interface OscNotification {
  title?: string;
  body?: string;
}

export interface OscResult {
  title?: string;
  cwd?: string;
  agentCwd?: string;
  notifications: OscNotification[];
}

export function parseOsc(data: string): OscResult {
  if (!data.includes("\x1b]")) {
    return { notifications: [] };
  }
  let title: string | undefined;
  let cwd: string | undefined;
  let agentCwd: string | undefined;
  const notifications: OscNotification[] = [];

  for (const [, code, payload] of data.matchAll(OSC_PATTERN)) {
    if (code === undefined || payload === undefined) continue;

    if (code === OSC_TITLE_ICON || code === OSC_TITLE) {
      title = payload;
    } else if (code === OSC_CWD) {
      const urlMatch = payload.match(/^file:\/\/[^/]*(\/.*)/);
      if (urlMatch?.[1]) {
        cwd = decodeURIComponent(urlMatch[1]);
      }
    } else if (code === OSC_RXVT_NOTIFY) {
      const parts = payload.split(";");
      if (parts[0] === "notify") {
        notifications.push({
          title: parts[1] || "Notification",
          body: parts[2],
        });
      } else if (parts[0] === "agentCwd") {
        agentCwd = parts[1] ?? "";
      }
    }
  }

  return { title, cwd, agentCwd, notifications };
}
