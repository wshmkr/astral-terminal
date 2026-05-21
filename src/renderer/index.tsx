import { WINDOW_HASH } from "../shared/types";

type Mount = (rootEl: HTMLElement) => void;

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

const ENTRIES: Record<string, () => Promise<{ mount: Mount }>> = {
  [`#${WINDOW_HASH.notifications}`]: () =>
    import("./notifications-window/entry"),
  [`#${WINDOW_HASH.settings}`]: () => import("./settings-window/entry"),
  [`#${WINDOW_HASH.browserFind}`]: () => import("./browser-find-entry"),
};

const loader = ENTRIES[window.location.hash] ?? (() => import("./main-entry"));

loader()
  .then((m) => m.mount(rootEl))
  .catch((err) => {
    console.error("Mount failed:", err);
    document.body.textContent = "Failed to start. See console for details.";
  });
