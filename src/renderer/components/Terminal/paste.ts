import type { Terminal } from "@xterm/xterm";

export function pasteText(
  term: Terminal,
  text: string,
  isLive?: () => boolean,
): void {
  if (!text) return;
  term.write("", () => {
    if (!isLive || isLive()) term.paste(text);
  });
}
