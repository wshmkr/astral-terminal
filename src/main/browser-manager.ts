import {
  type BrowserWindow,
  session,
  type WebContents,
  WebContentsView,
} from "electron";
import type { BrowserBounds, BrowserState } from "../shared/types";

// Browser surfaces use a separate persistent partition so cookies/storage are
// isolated from the app shell and to escape the renderer's strict CSP
const BROWSER_PARTITION = "persist:browser-default";

interface Entry {
  view: WebContentsView;
  state: BrowserState;
  disposed: boolean;
}

function emptyState(url: string): BrowserState {
  return {
    url,
    title: "",
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  };
}

function readNavState(
  webContents: WebContents,
): Pick<BrowserState, "canGoBack" | "canGoForward"> {
  const nav = webContents.navigationHistory;
  return { canGoBack: nav.canGoBack(), canGoForward: nav.canGoForward() };
}

function statesEqual(a: BrowserState, b: BrowserState): boolean {
  return (
    a.url === b.url &&
    a.title === b.title &&
    a.isLoading === b.isLoading &&
    a.canGoBack === b.canGoBack &&
    a.canGoForward === b.canGoForward
  );
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "about:blank";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (/^[^\s/]+\.[^\s/]+/.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export interface BrowserManagerCallbacks {
  onState: (surfaceId: string, state: BrowserState) => void;
}

export class BrowserManager {
  private entries = new Map<string, Entry>();

  constructor(
    private readonly window: BrowserWindow,
    private readonly callbacks: BrowserManagerCallbacks,
  ) {}

  create(surfaceId: string, initialUrl: string): void {
    if (this.entries.has(surfaceId)) return;

    const view = new WebContentsView({
      webPreferences: {
        session: session.fromPartition(BROWSER_PARTITION),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    view.setVisible(false);
    view.setBackgroundColor("#00000000");
    this.window.contentView.addChildView(view);

    const wc = view.webContents;

    const entry: Entry = {
      view,
      state: emptyState(initialUrl),
      disposed: false,
    };
    this.entries.set(surfaceId, entry);

    const update = (patch: Partial<BrowserState>) => {
      if (entry.disposed) return;
      const next = { ...entry.state, ...patch };
      if (statesEqual(entry.state, next)) return;
      entry.state = next;
      this.callbacks.onState(surfaceId, next);
    };

    wc.on("did-start-loading", () => update({ isLoading: true }));
    wc.on("did-stop-loading", () =>
      update({ isLoading: false, ...readNavState(wc) }),
    );
    wc.on("did-navigate", (_event, url) =>
      update({ url, ...readNavState(wc) }),
    );
    wc.on("did-navigate-in-page", (_event, url, isMainFrame) => {
      if (!isMainFrame) return;
      update({ url, ...readNavState(wc) });
    });
    wc.on("page-title-updated", (_event, title) => update({ title }));

    wc.loadURL(normalizeUrl(initialUrl)).catch((err) => {
      console.error("[browser] initial loadURL failed:", err);
    });
  }

  destroy(surfaceId: string): void {
    const entry = this.entries.get(surfaceId);
    if (!entry) return;
    entry.disposed = true;
    this.entries.delete(surfaceId);
    try {
      entry.view.webContents.removeAllListeners();
      this.window.contentView.removeChildView(entry.view);
      entry.view.webContents.close();
    } catch {}
  }

  destroyAll(): void {
    for (const id of [...this.entries.keys()]) this.destroy(id);
  }

  setBounds(surfaceId: string, bounds: BrowserBounds): void {
    const entry = this.entries.get(surfaceId);
    if (!entry) return;
    entry.view.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(0, Math.round(bounds.width)),
      height: Math.max(0, Math.round(bounds.height)),
    });
  }

  setVisible(surfaceId: string, visible: boolean): void {
    this.entries.get(surfaceId)?.view.setVisible(visible);
  }

  loadURL(surfaceId: string, url: string): void {
    const entry = this.entries.get(surfaceId);
    if (!entry) return;
    entry.view.webContents.loadURL(normalizeUrl(url)).catch((err) => {
      console.error("[browser] loadURL failed:", err);
    });
  }

  goBack(surfaceId: string): void {
    const wc = this.entries.get(surfaceId)?.view.webContents;
    if (wc?.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
  }

  goForward(surfaceId: string): void {
    const wc = this.entries.get(surfaceId)?.view.webContents;
    if (wc?.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  }

  reload(surfaceId: string): void {
    this.entries.get(surfaceId)?.view.webContents.reload();
  }

  stop(surfaceId: string): void {
    this.entries.get(surfaceId)?.view.webContents.stop();
  }

  focus(surfaceId: string): void {
    this.entries.get(surfaceId)?.view.webContents.focus();
  }
}
