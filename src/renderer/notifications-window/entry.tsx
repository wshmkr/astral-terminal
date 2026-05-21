import { createRoot } from "react-dom/client";
import { NotificationsApp } from "./app";

export function mount(rootEl: HTMLElement): void {
  createRoot(rootEl).render(<NotificationsApp />);
}
