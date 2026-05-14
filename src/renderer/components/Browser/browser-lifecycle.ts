import type {
  BrowserAnchorOffsets,
  BrowserCommand,
  BrowserState,
} from "../../../shared/types";
import type { SurfaceController } from "../../app/surface-lifecycle";

interface ControllerOptions {
  surfaceId: string;
  initialUrl: string;
  anchor: HTMLElement;
  onState: (state: BrowserState) => void;
}

export class BrowserController implements SurfaceController {
  private surfaceId: string;
  private anchor: HTMLElement;
  private onState: (state: BrowserState) => void;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribeState: (() => void) | null = null;
  private rafHandle = 0;
  private lastOffsets: BrowserAnchorOffsets | null = null;
  private disposed = false;

  constructor(opts: ControllerOptions) {
    this.surfaceId = opts.surfaceId;
    this.anchor = opts.anchor;
    this.onState = opts.onState;

    this.unsubscribeState = window.app.onBrowserState(
      opts.surfaceId,
      (state) => {
        if (this.disposed) return;
        this.onState(state);
      },
    );
    window.app.createBrowser(opts.surfaceId, opts.initialUrl);
    this.scheduleSync();
    this.resizeObserver = new ResizeObserver(() => this.scheduleSync());
    this.resizeObserver.observe(this.anchor);
  }

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
    const next: BrowserAnchorOffsets = {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      right: Math.round(window.innerWidth - rect.right),
      bottom: Math.round(window.innerHeight - rect.bottom),
    };
    const prev = this.lastOffsets;
    if (
      prev &&
      prev.left === next.left &&
      prev.top === next.top &&
      prev.right === next.right &&
      prev.bottom === next.bottom
    ) {
      return;
    }
    this.lastOffsets = next;
    window.app.setBrowserAnchorOffsets(this.surfaceId, next);
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

  command(cmd: BrowserCommand): void {
    if (this.disposed) return;
    window.app.browserCommand(this.surfaceId, cmd);
  }

  remeasure(): void {
    this.syncBoundsNow();
  }

  focus(): void {
    this.command("focus");
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
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    window.app.destroyBrowser(this.surfaceId);
  }
}
