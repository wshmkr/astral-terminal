import {
  type BrowserWindow,
  session,
  type WebContents,
  WebContentsView,
} from "electron";
import {
  type BrowserAnchorOffsets,
  type BrowserFindOptions,
  type BrowserFindResult,
  type BrowserOpenNewTabPayload,
  type BrowserState,
  defaultBrowserState,
  type ScreenRect,
  SETTINGS_FADE_EASING,
  SETTINGS_FADE_MS,
} from "../shared/types";
import {
  attachExternalLinkHandler,
  openInSystemBrowser,
  showLinkContextMenu,
} from "./external-links";
import { createFadeController } from "./fade-controller";

// Browser surfaces use a separate persistent partition so cookies/storage are
// isolated from the app shell and to escape the renderer's strict CSP
const BROWSER_PARTITION = "persist:browser-default";

interface Entry {
  view: WebContentsView;
  state: BrowserState;
  offsets: BrowserAnchorOffsets | null;
  visible: boolean;
  disposed: boolean;
  shiftHeld: boolean;
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

const DIM_HTML =
  "data:text/html;charset=utf-8," +
  encodeURIComponent(
    `<style>
      html,body { margin:0; height:100%; background:transparent; }
      body { opacity:0; transition:opacity ${SETTINGS_FADE_MS}ms ${SETTINGS_FADE_EASING}; background:rgba(0,0,0,0.5); }
      body.show { opacity:1; }
    </style>`,
  );

const ALLOWED_SCHEMES = new Set(["http", "https", "about"]);

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "about:blank";
  const scheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  if (scheme) {
    return ALLOWED_SCHEMES.has(scheme.toLowerCase()) ? trimmed : "about:blank";
  }
  if (/^[^\s/]+\.[^\s/]+/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export interface BrowserManagerCallbacks {
  onState: (surfaceId: string, state: BrowserState) => void;
  onOpenNewTab: (payload: BrowserOpenNewTabPayload) => void;
  onFindRequested: (surfaceId: string, anchor: ScreenRect) => void;
  onFindResult: (surfaceId: string, result: BrowserFindResult) => void;
  onSurfaceDestroyed: (surfaceId: string) => void;
  onSurfaceVisibilityChanged: (surfaceId: string, visible: boolean) => void;
  onSurfaceAnchorChanged: (surfaceId: string, anchor: ScreenRect) => void;
}

export class BrowserManager {
  private entries = new Map<string, Entry>();
  private dimView: WebContentsView | null = null;
  private dimVisible = false;
  private dimReady = false;
  private dimFade = createFadeController(SETTINGS_FADE_MS);

  constructor(
    private readonly window: BrowserWindow,
    private readonly callbacks: BrowserManagerCallbacks,
  ) {
    const reapplyAll = () => {
      for (const entry of this.entries.values()) {
        if (!entry.disposed && entry.visible) this.applyBounds(entry);
      }
      if (this.dimVisible) this.applyDimBounds();
    };
    this.window.on("resize", reapplyAll);
    this.window.on("maximize", reapplyAll);
    this.window.on("unmaximize", reapplyAll);
    this.window.on("enter-full-screen", reapplyAll);
    this.window.on("leave-full-screen", reapplyAll);
  }

  private ensureDimView(): WebContentsView {
    if (this.dimView) return this.dimView;
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    view.setBackgroundColor("#00000000");
    view.setVisible(false);
    view.webContents.once("did-finish-load", () => {
      this.dimReady = true;
      this.applyDimClass();
    });
    view.webContents.loadURL(DIM_HTML).catch((err) => {
      console.error("[browser] dim loadURL failed:", err);
    });
    this.window.contentView.addChildView(view);
    this.dimView = view;
    return view;
  }

  private applyDimClass(): void {
    if (!this.dimView || !this.dimReady) return;
    this.dimView.webContents
      .executeJavaScript(
        `document.body.classList.toggle('show', ${this.dimVisible})`,
      )
      .catch(() => {});
  }

  private applyDimBounds(): void {
    if (!this.dimView) return;
    const { width, height } = this.window.getContentBounds();
    this.dimView.setBounds({ x: 0, y: 0, width, height });
  }

  private bringDimToTop(): void {
    if (!this.dimView) return;
    this.window.contentView.removeChildView(this.dimView);
    this.window.contentView.addChildView(this.dimView);
  }

  create(surfaceId: string, url: string): void {
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
    if (this.dimVisible) this.bringDimToTop();

    const wc = view.webContents;
    const entry: Entry = {
      view,
      state: defaultBrowserState(url),
      offsets: null,
      visible: false,
      disposed: false,
      shiftHeld: false,
    };
    this.entries.set(surfaceId, entry);

    attachExternalLinkHandler(wc, (url, disposition) => {
      if (entry.shiftHeld) {
        openInSystemBrowser(url);
        return;
      }
      this.callbacks.onOpenNewTab({
        sourceSurfaceId: surfaceId,
        url,
        background: disposition === "background-tab",
      });
    });

    wc.on("before-input-event", (event, input) => {
      entry.shiftHeld = input.shift;
      if (
        input.type === "keyDown" &&
        input.control &&
        !input.shift &&
        !input.alt &&
        input.key.toLowerCase() === "f"
      ) {
        event.preventDefault();
        this.callbacks.onFindRequested(surfaceId, this.computeAnchor(entry));
      }
    });
    wc.on("blur", () => {
      entry.shiftHeld = false;
    });

    wc.on("will-navigate", (event, url) => {
      if (!entry.shiftHeld) return;
      event.preventDefault();
      openInSystemBrowser(url);
    });

    wc.on("context-menu", (_event, params) => {
      if (!params.linkURL) return;
      showLinkContextMenu(this.window, {
        url: params.linkURL,
        sourceSurfaceId: surfaceId,
      });
    });

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
    wc.on("did-navigate", (_event, url) => {
      update({ url, ...readNavState(wc) });
      wc.stopFindInPage("clearSelection");
    });
    wc.on("did-navigate-in-page", (_event, url, isMainFrame) => {
      if (!isMainFrame) return;
      update({ url, ...readNavState(wc) });
    });
    wc.on("page-title-updated", (_event, title) => update({ title }));
    wc.on("found-in-page", (_event, result) => {
      this.callbacks.onFindResult(surfaceId, {
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
        finalUpdate: result.finalUpdate,
      });
    });

    wc.loadURL(normalizeUrl(url)).catch((err) => {
      console.error("[browser] initial loadURL failed:", err);
    });
  }

  destroy(surfaceId: string): void {
    const entry = this.entries.get(surfaceId);
    if (!entry) return;
    entry.disposed = true;
    this.entries.delete(surfaceId);
    try {
      this.window.contentView.removeChildView(entry.view);
      entry.view.webContents.close();
    } catch {}
    this.callbacks.onSurfaceDestroyed(surfaceId);
  }

  destroyAll(): void {
    for (const id of [...this.entries.keys()]) this.destroy(id);
  }

  setAnchorOffsets(surfaceId: string, offsets: BrowserAnchorOffsets): void {
    const entry = this.entries.get(surfaceId);
    if (!entry) return;
    entry.offsets = offsets;
    this.applyBounds(entry);
    this.callbacks.onSurfaceAnchorChanged(surfaceId, this.computeAnchor(entry));
  }

  private applyBounds(entry: Entry): void {
    if (!entry.offsets) return;
    const { width, height } = this.window.getContentBounds();
    const { left, top, right, bottom } = entry.offsets;
    entry.view.setBounds({
      x: Math.round(left),
      y: Math.round(top),
      width: Math.max(0, Math.round(width - left - right)),
      height: Math.max(0, Math.round(height - top - bottom)),
    });
  }

  setVisible(surfaceId: string, visible: boolean): void {
    const entry = this.entries.get(surfaceId);
    if (!entry) return;
    const wasVisible = entry.visible;
    entry.visible = visible;
    if (visible && !wasVisible) this.applyBounds(entry);
    entry.view.setVisible(visible);
    if (wasVisible !== visible) {
      this.callbacks.onSurfaceVisibilityChanged(surfaceId, visible);
    }
  }

  setDimmed(dimmed: boolean): void {
    if (this.dimVisible === dimmed) return;
    this.dimVisible = dimmed;
    if (dimmed) {
      this.dimFade.cancelPendingHide();
      const view = this.ensureDimView();
      this.applyDimBounds();
      this.bringDimToTop();
      view.setVisible(true);
      this.applyDimClass();
    } else {
      const view = this.dimView;
      if (!view) return;
      this.applyDimClass();
      this.dimFade.scheduleHide(() => view.setVisible(false));
    }
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

  findInPage(surfaceId: string, opts: BrowserFindOptions): void {
    const wc = this.entries.get(surfaceId)?.view.webContents;
    if (!wc) return;
    if (!opts.text) {
      wc.stopFindInPage("clearSelection");
      return;
    }
    wc.findInPage(opts.text, {
      forward: opts.forward,
      matchCase: opts.matchCase,
      findNext: opts.findNext,
    });
  }

  stopFindInPage(surfaceId: string): void {
    this.entries
      .get(surfaceId)
      ?.view.webContents.stopFindInPage("clearSelection");
  }

  private computeAnchor(entry: Entry): ScreenRect {
    if (!entry.offsets) {
      const { width, height } = this.window.getContentBounds();
      return { x: 0, y: 0, width, height };
    }
    const { width, height } = this.window.getContentBounds();
    const { left, top, right, bottom } = entry.offsets;
    return {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.max(0, Math.round(width - left - right)),
      height: Math.max(0, Math.round(height - top - bottom)),
    };
  }
}
