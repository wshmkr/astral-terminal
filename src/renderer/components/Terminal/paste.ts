import type { Terminal } from "@xterm/xterm";

// Drain xterm's async write queue before pasting so bracketed-paste mode is
// current; otherwise a stale read drops bracketing and newlines submit.
export function pasteText(term: Terminal, text: string): void {
  if (!text) return;
  term.write("", () => term.paste(text));
}
