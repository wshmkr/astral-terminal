import { useEffect } from "react";
import {
  fromDomEvent,
  matchBinding,
  resolveBindings,
} from "../../shared/keybindings/match";
import { runCommand } from "./commands";

export function useKeybindings(isMac: boolean): void {
  useEffect(() => {
    const bindings = resolveBindings();
    function onKeyDown(e: KeyboardEvent): void {
      const command = matchBinding(fromDomEvent(e), bindings, isMac, "global");
      if (!command) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      runCommand(command);
    }
    // Capture phase so app shortcuts win over xterm's textarea key handler.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isMac]);
}
