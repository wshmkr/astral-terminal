type Mount = (rootEl: HTMLElement) => void;

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

function load(loader: () => Promise<{ mount: Mount }>): void {
  loader()
    .then((m) => m.mount(rootEl as HTMLElement))
    .catch((err) => {
      console.error("Mount failed:", err);
      document.body.textContent = "Failed to start. See console for details.";
    });
}

const hash = window.location.hash;
if (hash === "#notifications") {
  load(() => import("./notifications-window/entry"));
} else if (hash === "#settings") {
  load(() => import("./settings-window/entry"));
} else if (hash === "#browser-find") {
  load(() => import("./browser-find-entry"));
} else {
  load(() => import("./main-entry"));
}
