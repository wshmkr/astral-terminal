// biome-ignore lint/suspicious/noControlCharactersInRegex: OSC sequences use ESC and BEL
const OSC_PATTERN = /\x1b\](\d+);([^\x07\x1b]*?)(?:\x07|\x1b\\)/g;

const OSC_TITLE_ICON = "0";
const OSC_TITLE = "2";
const OSC_CWD = "7";
const OSC_RXVT_NOTIFY = "777";

// ConPTY seeds the title with the launched executable (e.g. the wsl.exe path)
// before the child shell runs; ignore those so bare shells that never emit
// their own title don't get stuck on the launcher path.
const WINDOWS_EXE_PATH = /^[A-Za-z]:[\\/].*\.exe\s*$/;

export interface OscNotification {
  title?: string;
  body?: string;
}

export interface OscResult {
  title?: string;
  cwd?: string;
  notifications: OscNotification[];
}

export function parseOsc(data: string): OscResult {
  if (!data.includes("\x1b]")) {
    return { notifications: [] };
  }
  let title: string | undefined;
  let cwd: string | undefined;
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
      }
    }
  }

  return { title, cwd, notifications };
}
