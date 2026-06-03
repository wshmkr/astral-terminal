import type {
  BrowserAnchorOffsets,
  BrowserCommand,
  BrowserState,
} from "../../../shared/types";
import type { SurfaceController } from "../../app/surface-lifecycle";
import { getState } from "../../store";

interface ControllerOptions {
  surfaceId: string;
  url: string;
  anchor: HTMLElement;
  onState: (state: BrowserState) => void;
}

// Strip exposed below the WebContentsView so the pane attention outline
// drawn beneath the native browser view shows on the bottom/left/right edges
const HIGHLIGHT_INSET_PX = 1;

export class BrowserController implements SurfaceController {
  private surfaceId: string;
  private anchor: HTMLElement;
  private onState: (state: BrowserState) => void;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribeState: (() => void) | null = null;
  private rafHandle = 0;
  private lastOffsets: BrowserAnchorOffsets | null = null;
  private disposed = false;
  private highlighted = false;

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
    window.app.createBrowser(opts.surfaceId, opts.url);
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
    const zoom = getState().appearance.uiScale;
    const rect = this.anchor.getBoundingClientRect();
    const inset = this.highlighted ? HIGHLIGHT_INSET_PX : 0;
    const next: BrowserAnchorOffsets = {
      left: Math.round((rect.left + inset) * zoom),
      top: Math.round(rect.top * zoom),
      right: Math.round((window.innerWidth - rect.right + inset) * zoom),
      bottom: Math.round((window.innerHeight - rect.bottom + inset) * zoom),
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

  setHighlighted(highlighted: boolean): void {
    if (this.disposed) return;
    if (this.highlighted === highlighted) return;
    this.highlighted = highlighted;
    this.syncBoundsNow();
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
