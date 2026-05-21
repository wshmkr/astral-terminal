import { createRoot } from "react-dom/client";
import { BrowserFindApp } from "./browser-find-app";

export function mount(rootEl: HTMLElement): void {
  createRoot(rootEl).render(<BrowserFindApp />);
}
