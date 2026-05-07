import type { BrowserBounds, BrowserState } from "../../../shared/types";

interface ControllerOptions {
  surfaceId: string;
  initialUrl: string;
  anchor: HTMLElement;
  onState: (state: BrowserState) => void;
}

export class BrowserController {
  private surfaceId: string;
  private anchor: HTMLElement;
  private onState: (state: BrowserState) => void;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribeState: (() => void) | null = null;
  private rafHandle = 0;
  private lastBounds: BrowserBounds | null = null;
  private disposed = false;

  constructor(opts: ControllerOptions) {
    this.surfaceId = opts.surfaceId;
    this.anchor = opts.anchor;
    this.onState = opts.onState;

    window.app.createBrowserView(opts.surfaceId, opts.initialUrl);
    this.unsubscribeState = window.app.onBrowserState(
      opts.surfaceId,
      (state) => {
        if (this.disposed) return;
        this.onState(state);
      },
    );
    this.scheduleSync();
    this.resizeObserver = new ResizeObserver(() => this.scheduleSync());
    this.resizeObserver.observe(this.anchor);
    window.addEventListener("resize", this.handleWindowResize);
  }

  private handleWindowResize = () => this.scheduleSync();

  private scheduleSync(): void {
    if (this.disposed) return;
    if (this.rafHandle) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = 0;
      this.syncBounds();
    });
  }

  syncBoundsNow(): void {
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = 0;
    }
    this.syncBounds();
  }

  private syncBounds(): void {
    if (this.disposed) return;
    const rect = this.anchor.getBoundingClientRect();
    const next: BrowserBounds = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.max(0, Math.round(rect.width)),
      height: Math.max(0, Math.round(rect.height)),
    };
    const prev = this.lastBounds;
    if (
      prev &&
      prev.x === next.x &&
      prev.y === next.y &&
      prev.width === next.width &&
      prev.height === next.height
    ) {
      return;
    }
    this.lastBounds = next;
    window.app.setBrowserBounds(this.surfaceId, next);
  }

  setVisible(visible: boolean): void {
    if (this.disposed) return;
    if (visible) this.syncBoundsNow();
    window.app.setBrowserVisible(this.surfaceId, visible);
  }

  loadURL(url: string): void {
    if (this.disposed) return;
    window.app.loadBrowserURL(this.surfaceId, url);
  }

  goBack(): void {
    window.app.browserGoBack(this.surfaceId);
  }
  goForward(): void {
    window.app.browserGoForward(this.surfaceId);
  }
  reload(): void {
    window.app.browserReload(this.surfaceId);
  }
  stop(): void {
    window.app.browserStop(this.surfaceId);
  }
  focus(): void {
    if (this.disposed) return;
    window.app.focusBrowser(this.surfaceId);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = 0;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.handleWindowResize);
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    window.app.destroyBrowserView(this.surfaceId);
  }
}
