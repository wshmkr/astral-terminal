import type { Terminal } from "@xterm/xterm";
import { quotePathForCwd } from "../../../shared/path-quoting";

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

export async function pasteClipboardImage(
  term: Terminal,
  blob: Blob,
  cwd: string,
  isLive?: () => boolean,
): Promise<void> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const filePath = await window.app.saveClipboardImage(bytes, blob.type);
    if (filePath) pasteText(term, quotePathForCwd(filePath, cwd), isLive);
  } catch (err) {
    console.warn("Clipboard image paste failed:", err);
    // Signal failure with the bell since the paste event was already consumed.
    term.write("\x07");
  }
}
