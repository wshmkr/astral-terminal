import { isPaneStatusSignal, type PaneStatus } from "../../../shared/types";

// biome-ignore lint/suspicious/noControlCharactersInRegex: OSC sequences use ESC and BEL
const OSC_PATTERN = /\x1b\](\d+);([^\x07\x1b]*?)(?:\x07|\x1b\\)/g;

const OSC_TITLE_ICON = "0";
const OSC_TITLE = "2";
const OSC_CWD = "7";
const OSC_RXVT_NOTIFY = "777";

// ConPTY seeds this as the initial title and bare shells never overwrite
const WINDOWS_EXE_PATH = /^[A-Za-z]:[\\/].*\.exe\s*$/;

export interface OscNotification {
  title?: string;
  body?: string;
}

export interface OscResult {
  title?: string;
  cwd?: string;
  notifications: OscNotification[];
  // Absent = no signal in this chunk; `next: undefined` = clear the tag.
  status?: { next: PaneStatus | undefined };
}

export function parseOsc(data: string): OscResult {
  if (!data.includes("\x1b]")) {
    return { notifications: [] };
  }
  let title: string | undefined;
  let cwd: string | undefined;
  let status: OscResult["status"];
  const notifications: OscNotification[] = [];

  for (const [, code, payload] of data.matchAll(OSC_PATTERN)) {
    if (code === undefined || payload === undefined) continue;

    if (code === OSC_TITLE_ICON || code === OSC_TITLE) {
      if (!WINDOWS_EXE_PATH.test(payload)) title = payload;
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
      } else if (parts[0] === "status" && isPaneStatusSignal(parts[1])) {
        status = { next: parts[1] === "working" ? undefined : parts[1] };
      }
    }
  }

  return { title, cwd, notifications, status };
}
