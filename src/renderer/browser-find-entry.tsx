import { createRoot } from "react-dom/client";
import { BrowserFindApp } from "./browser-find-app";

export function mount(rootEl: HTMLElement): void {
  rootEl.style.height = "100vh";
  createRoot(rootEl).render(<BrowserFindApp />);
}
