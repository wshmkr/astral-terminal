import { createRoot } from "react-dom/client";
import { NotificationsApp } from "./app";

export function mount(rootEl: HTMLElement): void {
  rootEl.style.height = "100vh";
  createRoot(rootEl).render(<NotificationsApp />);
}
