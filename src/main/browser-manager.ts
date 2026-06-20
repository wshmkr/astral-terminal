import {
  type BrowserWindow,
  session,
  type WebContents,
  WebContentsView,
} from "electron";
import {
  fromElectronInput,
  matchBinding,
  resolveBindings,
} from "../shared/keybindings/match";
import type { CommandId } from "../shared/keybindings/types";
import {
  BARE_DOMAIN_RE,
  type BrowserSettings,
  buildSearchUrl,
  DEFAULT_BROWSER_SETTINGS,
} from "../shared/settings-types";
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
import { disableAdBlock, enableAdBlock } from "./ad-blocker";
import {
  attachExternalLinkHandler,
  openInSystemBrowser,
  showBrowserContextMenu,
} from "./external-links";
import { createFadeController } from "./fade-controller";

// Browser surfaces use a separate persistent partition so cookies/storage are
// isolated from the app shell and to escape the renderer's strict CSP
const BROWSER_PARTITION = "persist:browser-default";

const IS_MAC = process.platform === "darwin";

interface Entry {
  view: WebContentsView;
  state: BrowserState;
  offsets: BrowserAnchorOffsets | null;
  visible: boolean;
  disposed: boolean;
  shiftHeld: boolean;
  pendingFaviconUrl: string | null;
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
    a.canGoForward === b.canGoForward &&
    a.favicon === b.favicon
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

// Two stacked layers matching the terminal panes' DOM hints exactly: a
// full-bleed merge tint at 0.1 and an edge split preview at 0.25, each a
// separate element with its own opacity so they composite identically.
const SPLIT_PREVIEW_HTML =
  "data:text/html;charset=utf-8," +
  encodeURIComponent(
    `<style>
      html,body { margin:0; height:100%; }
      #m,#s { position:absolute; background:var(--c,transparent); pointer-events:none; display:none; }
      #m { inset:0; opacity:0.1; }
      #s { opacity:0.25; }
      #s.right { top:0; right:0; bottom:0; width:50%; }
      #s.bottom { left:0; right:0; bottom:0; height:50%; }
    </style>
    <div id="m"></div><div id="s"></div>`,
  );

const MAX_FAVICON_BYTES = 256 * 1024;
const FAVICON_SCHEMES = new Set(["http:", "https:", "data:"]);
const FAVICON_CACHE_MAX = 64;
const originFaviconCache = new Map<string, string>();

function httpOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function getOriginFavicon(pageUrl: string): string | null {
  const origin = httpOrigin(pageUrl);
  if (!origin) return null;
  const hit = originFaviconCache.get(origin);
  if (hit === undefined) return null;
  originFaviconCache.delete(origin);
  originFaviconCache.set(origin, hit);
  return hit;
}

function setOriginFavicon(pageUrl: string, dataUrl: string): void {
  const origin = httpOrigin(pageUrl);
  if (!origin) return;
  if (originFaviconCache.has(origin)) originFaviconCache.delete(origin);
  originFaviconCache.set(origin, dataUrl);
  if (originFaviconCache.size > FAVICON_CACHE_MAX) {
    const oldest = originFaviconCache.keys().next().value;
    if (oldest !== undefined) originFaviconCache.delete(oldest);
  }
}

async function fetchFaviconDataUrl(url: string): Promise<string | null> {
  let scheme: string;
  try {
    scheme = new URL(url).protocol;
  } catch {
    return null;
  }
  if (!FAVICON_SCHEMES.has(scheme)) return null;
  if (scheme === "data:") return url;
  try {
    const response = await session.fromPartition(BROWSER_PARTITION).fetch(url);
    if (!response.ok) {
      console.warn(`[browser] favicon fetch ${response.status} for ${url}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_FAVICON_BYTES) {
      return null;
    }
    const mime =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/x-icon";
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn(`[browser] favicon fetch failed for ${url}:`, err);
    return null;
  }
}

const ALLOWED_SCHEMES = new Set(["http", "https", "about"]);

function normalizeUrl(raw: string, settings: BrowserSettings): string {
  const trimmed = raw.trim();
  if (!trimmed) return "about:blank";
  const scheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  if (scheme) {
    return ALLOWED_SCHEMES.has(scheme.toLowerCase()) ? trimmed : "about:blank";
  }
  if (BARE_DOMAIN_RE.test(trimmed)) return `https://${trimmed}`;
  return buildSearchUrl(trimmed, settings);
}

const SEC_GPC_HEADER = "Sec-GPC";

function installPrivacyHooks(
  browserSession: Electron.Session,
  getSettings: () => BrowserSettings,
): void {
  browserSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (getSettings().sendGpc) details.requestHeaders[SEC_GPC_HEADER] = "1";
    callback({ requestHeaders: details.requestHeaders });
  });
}

export interface BrowserManagerCallbacks {
  onState: (surfaceId: string, state: BrowserState) => void;
  onOpenNewTab: (payload: BrowserOpenNewTabPayload) => void;
  onFindRequested: (surfaceId: string, anchor: ScreenRect) => void;
  onFindResult: (surfaceId: string, result: BrowserFindResult) => void;
  onFocusAddressBar: (surfaceId: string) => void;
  onRunGlobalCommand: (command: CommandId) => void;
  onSurfaceHidden: (surfaceId: string) => void;
  onSurfaceAnchorChanged: (surfaceId: string, anchor: ScreenRect) => void;
}

function offsetsEqual(
  a: BrowserAnchorOffsets,
  b: BrowserAnchorOffsets,
): boolean {
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.right === b.right &&
    a.bottom === b.bottom
  );
}

export class BrowserManager {
  private entries = new Map<string, Entry>();
  private dimView: WebContentsView | null = null;
  private dimVisible = false;
  // Top-most overlay covering a browser pane's surface body during a tab drag,
  // mirroring the renderer's DOM drop hints (which native browser views would
  // otherwise occlude): a full-pane merge tint plus an edge split preview
  private splitPreviewView: WebContentsView | null = null;
  private splitPreviewReady = false;
  private splitPreviewColor: string | null = null;
  private splitPreviewEdge: "right" | "bottom" | null = null;
  private splitPreviewMerge = false;
  private splitPreviewVisible = false;
  private dimReady = false;
  private dimFade = createFadeController(SETTINGS_FADE_MS);
  private browserSettings: BrowserSettings = DEFAULT_BROWSER_SETTINGS;
  private adBlockApplied = false;
  private privacyHooksInstalled = false;

  setBrowserSettings(settings: BrowserSettings): void {
    const previous = this.browserSettings;
    this.browserSettings = settings;
    const browserSession = session.fromPartition(BROWSER_PARTITION);
    if (
      settings.adBlockEnabled !== previous.adBlockEnabled ||
      !this.adBlockApplied
    ) {
      if (settings.adBlockEnabled) {
        void enableAdBlock(browserSession);
      } else {
        void disableAdBlock(browserSession);
      }
      this.adBlockApplied = true;
    }
    if (!this.privacyHooksInstalled) {
      installPrivacyHooks(browserSession, () => this.browserSettings);
      this.privacyHooksInstalled = true;
    }
  }

  constructor(
    private readonly window: BrowserWindow,
    private readonly callbacks: BrowserManagerCallbacks,
  ) {
    const reapplyAll = () => {
      for (const entry of this.entries.values()) {
        if (!entry.disposed && entry.visible) this.applyBounds(entry);
      }
      if (this.dimVisible) this.applyDimBounds();
      // The split preview's bounds come from a renderer-measured rect we can't
      // recompute here, so hide it on window geometry changes rather than let
      // it sit misaligned; the next drag-over re-shows it with a fresh rect.
      if (this.splitPreviewVisible) {
        this.splitPreviewVisible = false;
        this.splitPreviewView?.setVisible(false);
      }
    };
    this.window.on("resize", reapplyAll);
    this.window.on("maximize", reapplyAll);
    this.window.on("unmaximize", reapplyAll);
    this.window.on("enter-full-screen", reapplyAll);
    this.window.on("leave-full-screen", reapplyAll);
  }

  // Shared bootstrap for the transparent, top-most overlay views (dim + split
  // preview): create hidden, load HTML, fire onReady once loaded, add to top.
  private createOverlayView(
    html: string,
    label: string,
    onReady: () => void,
  ): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    view.setBackgroundColor("#00000000");
    view.setVisible(false);
    view.webContents.once("did-finish-load", onReady);
    view.webContents.loadURL(html).catch((err) => {
      console.error(`[browser] ${label} loadURL failed:`, err);
    });
    this.window.contentView.addChildView(view);
    return view;
  }

  private ensureDimView(): WebContentsView {
    if (this.dimView) return this.dimView;
    this.dimView = this.createOverlayView(DIM_HTML, "dim", () => {
      this.dimReady = true;
      this.applyDimClass();
    });
    return this.dimView;
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
      pendingFaviconUrl: null,
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
      if (input.type !== "keyDown") return;
      const normalized = fromElectronInput(input);
      const bindings = resolveBindings();
      const browserCommand = matchBinding(
        normalized,
        bindings,
        IS_MAC,
        "browser",
      );
      if (browserCommand) {
        event.preventDefault();
        const nav = wc.navigationHistory;
        switch (browserCommand) {
          case "browser.back":
            if (nav.canGoBack()) nav.goBack();
            break;
          case "browser.forward":
            if (nav.canGoForward()) nav.goForward();
            break;
          case "browser.reload":
            wc.reload();
            break;
          case "browser.devtools":
            wc.toggleDevTools();
            break;
          case "browser.focusAddressBar":
            this.callbacks.onFocusAddressBar(surfaceId);
            break;
          case "browser.find":
            this.callbacks.onFindRequested(
              surfaceId,
              this.computeAnchor(entry),
            );
            break;
          default:
            break;
        }
        return;
      }
      // Browser views hold OS focus, so forward global shortcuts the renderer never sees
      const globalCommand = matchBinding(
        normalized,
        bindings,
        IS_MAC,
        "global",
      );
      if (globalCommand) {
        event.preventDefault();
        this.callbacks.onRunGlobalCommand(globalCommand);
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
      showBrowserContextMenu(this.window, params, {
        webContents: wc,
        surface: { id: surfaceId },
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
      entry.pendingFaviconUrl = null;
      update({ url, favicon: getOriginFavicon(url), ...readNavState(wc) });
      wc.stopFindInPage("clearSelection");
    });
    wc.on("did-navigate-in-page", (_event, url, isMainFrame) => {
      if (!isMainFrame) return;
      update({ url, ...readNavState(wc) });
    });
    wc.on("page-title-updated", (_event, title) => update({ title }));
    wc.on("page-favicon-updated", (_event, favicons) => {
      const url = favicons[0];
      const pageUrl = wc.getURL();
      if (!url) {
        entry.pendingFaviconUrl = null;
        update({ favicon: null });
        return;
      }
      entry.pendingFaviconUrl = url;
      fetchFaviconDataUrl(url).then((dataUrl) => {
        if (entry.disposed || entry.pendingFaviconUrl !== url) return;
        entry.pendingFaviconUrl = null;
        if (dataUrl) setOriginFavicon(pageUrl, dataUrl);
        update({ favicon: dataUrl });
      });
    });
    wc.on("found-in-page", (_event, result) => {
      this.callbacks.onFindResult(surfaceId, {
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
        finalUpdate: result.finalUpdate,
      });
    });

    wc.loadURL(normalizeUrl(url, this.browserSettings)).catch((err) => {
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
    this.callbacks.onSurfaceHidden(surfaceId);
  }

  destroyAll(): void {
    for (const id of [...this.entries.keys()]) this.destroy(id);
    if (this.splitPreviewView) {
      try {
        this.window.contentView.removeChildView(this.splitPreviewView);
        this.splitPreviewView.webContents.close();
      } catch {}
      this.splitPreviewView = null;
      this.splitPreviewReady = false;
    }
  }

  async clearBrowsingData(): Promise<void> {
    const browserSession = session.fromPartition(BROWSER_PARTITION);
    originFaviconCache.clear();
    for (const [surfaceId, entry] of this.entries) {
      if (entry.disposed) continue;
      const wc = entry.view.webContents;
      wc.navigationHistory.clear();
      const next: BrowserState = {
        ...entry.state,
        ...readNavState(wc),
        favicon: null,
      };
      if (statesEqual(entry.state, next)) continue;
      entry.state = next;
      this.callbacks.onState(surfaceId, next);
    }
    await Promise.all([
      browserSession.clearStorageData(),
      browserSession.clearCache(),
      browserSession.clearAuthCache(),
    ]);
  }

  setAnchorOffsets(surfaceId: string, offsets: BrowserAnchorOffsets): void {
    const entry = this.entries.get(surfaceId);
    if (!entry) return;
    if (entry.offsets && offsetsEqual(entry.offsets, offsets)) return;
    entry.offsets = offsets;
    this.applyBounds(entry);
    this.callbacks.onSurfaceAnchorChanged(surfaceId, this.computeAnchor(entry));
  }

  private applyBounds(entry: Entry): void {
    if (!entry.offsets) return;
    entry.view.setBounds(this.contentRect(entry.offsets));
  }

  setVisible(surfaceId: string, visible: boolean): void {
    const entry = this.entries.get(surfaceId);
    if (!entry) return;
    const wasVisible = entry.visible;
    if (wasVisible === visible) return;
    entry.visible = visible;
    if (visible) this.applyBounds(entry);
    const surrenderingFocus = !visible && entry.view.webContents.isFocused();
    entry.view.setVisible(visible);
    if (!visible) {
      // Hand OS focus back to the renderer so the newly active surface can take it
      if (surrenderingFocus) this.window.webContents.focus();
      this.callbacks.onSurfaceHidden(surfaceId);
    }
  }

  private ensureSplitPreviewView(): WebContentsView {
    if (this.splitPreviewView) return this.splitPreviewView;
    this.splitPreviewView = this.createOverlayView(
      SPLIT_PREVIEW_HTML,
      "split-preview",
      () => {
        this.splitPreviewReady = true;
        this.showSplitPreviewWhenReady();
      },
    );
    return this.splitPreviewView;
  }

  private applySplitPreviewState(): Promise<void> {
    if (!this.splitPreviewView || !this.splitPreviewReady) {
      return Promise.resolve();
    }
    const color = this.splitPreviewColor ?? "transparent";
    const merge = this.splitPreviewMerge ? "block" : "none";
    const edge = this.splitPreviewEdge ?? "";
    return this.splitPreviewView.webContents
      .executeJavaScript(
        `(() => {
          document.documentElement.style.setProperty('--c', ${JSON.stringify(color)});
          const m = document.getElementById('m');
          const s = document.getElementById('s');
          if (m) m.style.display = ${JSON.stringify(merge)};
          if (s) { s.className = ${JSON.stringify(edge)}; s.style.display = ${JSON.stringify(edge ? "block" : "none")}; }
        })()`,
      )
      .then(() => {})
      .catch(() => {});
  }

  private bringSplitPreviewToTop(): void {
    if (!this.splitPreviewView) return;
    this.window.contentView.removeChildView(this.splitPreviewView);
    this.window.contentView.addChildView(this.splitPreviewView);
  }

  // Reveal the overlay only after its content/color have actually been applied
  // (and after the first load), so the first frame is never empty or stale.
  private showSplitPreviewWhenReady(): void {
    const view = this.splitPreviewView;
    if (!view || !this.splitPreviewReady) return;
    void this.applySplitPreviewState().then(() => {
      if (!this.splitPreviewVisible) return;
      this.bringSplitPreviewToTop();
      view.setVisible(true);
    });
  }

  setSplitPreview(
    rect: ScreenRect | null,
    edge: "right" | "bottom" | null,
    merge: boolean,
    color: string,
  ): void {
    if (!rect) {
      this.splitPreviewVisible = false;
      this.splitPreviewView?.setVisible(false);
      return;
    }
    this.splitPreviewVisible = true;
    this.splitPreviewColor = color;
    this.splitPreviewEdge = edge;
    this.splitPreviewMerge = merge;
    const view = this.ensureSplitPreviewView();
    view.setBounds({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
    this.showSplitPreviewWhenReady();
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
    entry.view.webContents
      .loadURL(normalizeUrl(url, this.browserSettings))
      .catch((err) => {
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
    return this.contentRect(entry.offsets);
  }

  private contentRect(offsets: BrowserAnchorOffsets): ScreenRect {
    const { width, height } = this.window.getContentBounds();
    const { left, top, right, bottom } = offsets;
    return {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.max(0, Math.round(width - left - right)),
      height: Math.max(0, Math.round(height - top - bottom)),
    };
  }
}
