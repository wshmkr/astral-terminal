import type { Terminal } from "@xterm/xterm";
import {
  quoteForPosixShell,
  windowsPathToWsl,
} from "../../../shared/path-quoting";

export function attachDropHandlers(
  container: HTMLElement,
  term: Terminal,
  getCwd: () => string,
  onSelect: () => void,
): () => void {
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (e: DragEvent) => {
    const dt = e.dataTransfer;
    if (!dt) return;

    const files = Array.from(dt.files);
    const text = files.length === 0 ? dt.getData("text/plain") : "";
    if (files.length === 0 && !text) return;

    e.preventDefault();
    onSelect();

    if (files.length > 0) {
      const cwdIsPosix = getCwd().startsWith("/");
      const quoted = files
        .map((f) => window.app.getPathForFile(f))
        .filter((p) => p.length > 0)
        .map((p) => (cwdIsPosix ? windowsPathToWsl(p) : p))
        .map(quoteForPosixShell);
      if (quoted.length > 0) term.paste(quoted.join(" "));
    } else {
      term.paste(text);
    }
    term.focus();
  };

  container.addEventListener("dragover", onDragOver);
  container.addEventListener("drop", onDrop);
  return () => {
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("drop", onDrop);
  };
}
