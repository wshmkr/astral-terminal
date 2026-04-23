import { useEffect } from "react";
import {
  closePane,
  createWorkspace,
  getState,
  setActiveWorkspace,
  splitPane,
} from "../store";

export function useKeyboard() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const s = getState();
      if (e.ctrlKey && e.shiftKey) {
        switch (e.code) {
          case "KeyD":
            e.preventDefault();
            if (s.focusedPaneId) splitPane(s.focusedPaneId, "vertical");
            return;
          case "KeyE":
            e.preventDefault();
            if (s.focusedPaneId) splitPane(s.focusedPaneId, "horizontal");
            return;
          case "KeyW":
            e.preventDefault();
            if (s.focusedPaneId) closePane(s.focusedPaneId);
            return;
          case "KeyT":
            e.preventDefault();
            createWorkspace();
            return;
        }
      }
      if (e.ctrlKey && !e.shiftKey && e.code.startsWith("Digit")) {
        const idx = Number(e.code.slice(5)) - 1;
        const ws = idx >= 0 && idx < 8 ? s.workspaces[idx] : undefined;
        if (ws) {
          e.preventDefault();
          setActiveWorkspace(ws.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
