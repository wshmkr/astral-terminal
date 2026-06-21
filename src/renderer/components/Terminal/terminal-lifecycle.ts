import { FitAddon } from "@xterm/addon-fit";
import {
  type ISearchDecorationOptions,
  SearchAddon,
} from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import {
  fromDomEvent,
  matchBinding,
  resolveBindings,
} from "../../../shared/keybindings/match";
import { windowsPtyOptions } from "../../../shared/pty-options";
import type { AppConfig, TerminalTheme } from "../../../shared/types";
import type { SurfaceController } from "../../app/surface-lifecycle";
import {
  addSurface,
  findPaneBySurfaceId,
  getState,
  setActiveWorkspace,
} from "../../store";
import type { FindController, FindMatches } from "../Find/FindBar";
import { attachDropHandlers } from "./drop-handlers";
import { parseOsc } from "./osc";
import { pasteText } from "./paste";

const RESIZE_DEBOUNCE_MS = 100;

function findDecorationsFromTheme(
  theme: TerminalTheme,
): ISearchDecorationOptions {
  return {
    matchBackground: theme.searchHighlight,
    matchOverviewRuler: theme.searchHighlight,
    activeMatchBackground: theme.searchHighlight,
    activeMatchColorOverviewRuler: theme.searchHighlight,
  };
}

const fontPreloadCache = new Map<string, Promise<unknown>>();

export function preloadFont(fontStack: string, size: number): Promise<unknown> {
  const key = `${size}|${fontStack}`;
  let cached = fontPreloadCache.get(key);
  if (!cached) {
    cached = Promise.all([
      document.fonts.load(`${size}px ${fontStack}`),
      document.fonts.load(`bold ${size}px ${fontStack}`),
      document.fonts.load(`italic ${size}px ${fontStack}`),
      document.fonts.load(`bold italic ${size}px ${fontStack}`),
    ]);
    fontPreloadCache.set(key, cached);
  }
  return cached;
}

interface TerminalAddons {
  term: Terminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
}

function openTerminalLink(
  sourceSurfaceId: string,
  event: MouseEvent,
  uri: string,
) {
  if (event.button === 2) return;
  if (event.shiftKey) {
    window.app.openExternal(uri);
    return;
  }
  const location = findPaneBySurfaceId(sourceSurfaceId);
  if (!location) {
    window.app.openExternal(uri);
    return;
  }
  if (getState().activeWorkspaceId !== location.workspaceId) {
    setActiveWorkspace(location.workspaceId);
  }
  const background = event.ctrlKey || event.metaKey || event.button === 1;
  addSurface(location.paneId, "browser", { url: uri, activate: !background });
}

interface LinkHoverState {
  uri: string | null;
}

function createTerminal(
  container: HTMLElement,
  opts: {
    config: AppConfig;
    theme: TerminalTheme;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    surfaceId: string;
    linkHover: LinkHoverState;
  },
): TerminalAddons {
  container.style.backgroundColor = opts.theme.background;

  const term = new Terminal({
    fontFamily: opts.fontFamily,
    fontSize: opts.fontSize,
    lineHeight: opts.lineHeight,
    cursorBlink: true,
    cursorStyle: "bar",
    scrollback: 10000,
    theme: opts.theme,
    windowsPty: windowsPtyOptions(opts.config),
    allowProposedApi: true,
  });

  const fitAddon = new FitAddon();
  const searchAddon = new SearchAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(searchAddon);
  term.loadAddon(new Unicode11Addon());
  term.unicode.activeVersion = "11";
  term.loadAddon(
    new WebLinksAddon(
      (event, uri) => {
        openTerminalLink(opts.surfaceId, event, uri);
      },
      {
        hover: (_event, uri) => {
          opts.linkHover.uri = uri;
        },
        leave: () => {
          opts.linkHover.uri = null;
        },
      },
    ),
  );

  return { term, fitAddon, searchAddon };
}

function attachClipboardHandlers(
  term: Terminal,
  container: HTMLElement,
  onRequestFind: () => void,
  opts: { surfaceId: string; linkHover: LinkHoverState; isLive: () => boolean },
): () => void {
  const pasteFromClipboard = () => {
    navigator.clipboard
      .readText()
      .then((text) => {
        pasteText(term, text, opts.isLive);
      })
      .catch((err) => {
        console.warn("Clipboard read failed:", err);
      });
  };

  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    e.stopPropagation();
    pasteText(term, text, opts.isLive);
  };
  container.addEventListener("paste", onPaste, true);

  const isMac = window.app.platform.isMac;
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== "keydown") return true;
    const command = matchBinding(
      fromDomEvent(e),
      resolveBindings(),
      isMac,
      "terminal",
    );
    if (!command) return e.key !== "ScrollLock";
    if (command === "terminal.copy") {
      const sel = term.getSelection();
      if (!sel) return true; // no selection: let the key reach the PTY (Ctrl+C -> SIGINT)
      e.preventDefault();
      navigator.clipboard.writeText(sel);
      return false;
    }
    e.preventDefault();
    switch (command) {
      case "terminal.paste":
        pasteFromClipboard();
        break;
      case "terminal.find":
        onRequestFind();
        break;
    }
    return false;
  });

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (opts.linkHover.uri) {
      window.app.showLinkMenu({
        url: opts.linkHover.uri,
        sourceSurfaceId: opts.surfaceId,
      });
      return;
    }
    const sel = term.getSelection();
    if (sel) {
      navigator.clipboard.writeText(sel);
      term.clearSelection();
    } else {
      pasteFromClipboard();
    }
  };
  container.addEventListener("contextmenu", onContextMenu);

  return () => {
    container.removeEventListener("paste", onPaste, true);
    container.removeEventListener("contextmenu", onContextMenu);
  };
}

export interface TerminalControllerOptions {
  container: HTMLElement;
  config: AppConfig;
  theme: TerminalTheme;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  surfaceId: string;
  cwd: string;
  getLiveSurface: () => { cwd: string };
  onCwdChange: (cwd: string) => void;
  onTitleChange: (title: string) => void;
  onNotification: (title: string | undefined, body: string | undefined) => void;
  onRequestFind: () => void;
  onSelect: () => void;
}

export class TerminalController implements SurfaceController, FindController {
  readonly term: Terminal;
  private readonly fitAddon: FitAddon;
  private readonly searchAddon: SearchAddon;
  private findDecorations: ISearchDecorationOptions;
  private readonly resizeObserver: ResizeObserver;
  private readonly cleanupFns: Array<() => void> = [];

  private ptyId: string | null = null;
  private disposed = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private preReplayBuffer: string[] | null = [];
  private pendingReplay: {
    cols: number;
    rows: number;
    content: string;
  } | null = null;
  private pendingOpen = false;

  constructor(private readonly opts: TerminalControllerOptions) {
    const linkHover: LinkHoverState = { uri: null };
    const { term, fitAddon, searchAddon } = createTerminal(opts.container, {
      config: opts.config,
      theme: opts.theme,
      fontFamily: opts.fontFamily,
      fontSize: opts.fontSize,
      lineHeight: opts.lineHeight,
      surfaceId: opts.surfaceId,
      linkHover,
    });
    this.term = term;
    this.fitAddon = fitAddon;
    this.searchAddon = searchAddon;
    this.findDecorations = findDecorationsFromTheme(opts.theme);

    // xterm's renderer can't measure cell metrics on a 0×0 container
    if (opts.container.offsetWidth > 0 && opts.container.offsetHeight > 0) {
      this.term.open(opts.container);
    } else {
      this.pendingOpen = true;
    }

    this.cleanupFns.push(
      attachClipboardHandlers(term, opts.container, opts.onRequestFind, {
        surfaceId: opts.surfaceId,
        linkHover,
        isLive: () => !this.disposed,
      }),
      attachDropHandlers(
        opts.container,
        term,
        () => opts.getLiveSurface().cwd,
        opts.onSelect,
        () => !this.disposed,
      ),
    );

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.resizeTimer = null;
        if (!this.disposed) this.safeFit();
      }, RESIZE_DEBOUNCE_MS);
    });
    this.resizeObserver.observe(opts.container);

    this.startPty();
  }

  fit(): void {
    this.safeFit();
  }

  remeasure(): void {
    this.safeFit();
  }

  setVisible(visible: boolean): void {
    if (visible) this.safeFit();
  }

  focus(): void {
    if (this.pendingOpen) return;
    this.term.focus();
  }

  setTheme(theme: TerminalTheme): void {
    if (this.disposed) return;
    this.term.options.theme = theme;
    this.opts.container.style.backgroundColor = theme.background;
    this.findDecorations = findDecorationsFromTheme(theme);
  }

  setFont(fontFamily: string, fontSize: number): void {
    if (this.disposed) return;
    this.term.options.fontFamily = fontFamily;
    this.term.options.fontSize = fontSize;
    this.safeFit();
  }

  setLineHeight(lineHeight: number): void {
    if (this.disposed) return;
    this.term.options.lineHeight = lineHeight;
    this.safeFit();
  }

  findNext(query: string, caseSensitive: boolean): void {
    if (this.disposed) return;
    if (!query) {
      this.searchAddon.clearDecorations();
      return;
    }
    this.searchAddon.findNext(query, {
      caseSensitive,
      decorations: this.findDecorations,
    });
  }

  findPrevious(query: string, caseSensitive: boolean): void {
    if (this.disposed) return;
    if (!query) {
      this.searchAddon.clearDecorations();
      return;
    }
    this.searchAddon.findPrevious(query, {
      caseSensitive,
      decorations: this.findDecorations,
    });
  }

  clearFind(): void {
    if (this.disposed) return;
    this.searchAddon.clearDecorations();
    this.term.clearSelection();
  }

  onFindResults(cb: (m: FindMatches | undefined) => void): () => void {
    const sub = this.searchAddon.onDidChangeResults(cb);
    return () => sub.dispose();
  }

  dispose(): void {
    this.disposed = true;
    this.resizeObserver.disconnect();
    if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
    for (const fn of this.cleanupFns) fn();
    if (this.ptyId) window.app.killPty(this.ptyId);
    this.term.dispose();
  }

  private safeFit(): void {
    const { container } = this.opts;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return;
    if (this.pendingOpen) {
      this.pendingOpen = false;
      this.term.open(container);
    }
    if (this.pendingReplay) {
      const { cols, rows, content } = this.pendingReplay;
      this.pendingReplay = null;
      this.term.resize(cols, rows);
      this.term.write(content);
    }
    const proposed = this.fitAddon.proposeDimensions();
    if (!proposed) return;
    if (proposed.cols === this.term.cols && proposed.rows === this.term.rows)
      return;
    this.fitAddon.fit();
  }

  private async startPty(): Promise<void> {
    const proposed = this.pendingOpen
      ? undefined
      : this.fitAddon.proposeDimensions();
    if (proposed) this.term.resize(proposed.cols, proposed.rows);
    const id = await window.app.createPty({
      cwd: this.opts.cwd,
      surfaceId: this.opts.surfaceId,
      cols: proposed?.cols,
      rows: proposed?.rows,
      wslDistro: getState().terminalSettings.wslDistro,
    });
    if (this.disposed) {
      window.app.killPty(id);
      return;
    }
    this.ptyId = id;

    const replayPromise = window.app.replayPty(id);

    this.cleanupFns.push(
      window.app.onPtyData(id, (data) => this.onPtyData(data)),
      window.app.onPtyExit(id, () => {
        if (this.disposed) return;
        this.term.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
      }),
      window.app.onPtyCwd(id, (cwd) => {
        if (this.disposed) return;
        if (cwd !== this.opts.getLiveSurface().cwd) this.opts.onCwdChange(cwd);
      }),
    );

    const replay = await replayPromise;
    if (this.disposed) return;
    if (replay.content) {
      this.pendingReplay = replay;
      this.safeFit();
    }

    const buffered = this.preReplayBuffer ?? [];
    this.preReplayBuffer = null;
    for (const chunk of buffered) this.onPtyData(chunk);

    this.term.onData((data) => window.app.writePty(id, data));
    this.term.onResize(({ cols, rows }) =>
      window.app.resizePty(id, cols, rows),
    );

    this.safeFit();
    // pre-fit term dims would push 80×24 or stale saved dims to main
    if (!this.pendingReplay && !this.pendingOpen) {
      window.app.resizePty(id, this.term.cols, this.term.rows);
    }
    if (!this.pendingOpen) this.term.focus();
  }

  private onPtyData(data: string): void {
    if (this.disposed) return;
    if (this.preReplayBuffer !== null) {
      this.preReplayBuffer.push(data);
      return;
    }
    this.term.write(data);
    const osc = parseOsc(data);
    if (osc.cwd && osc.cwd !== this.opts.getLiveSurface().cwd)
      this.opts.onCwdChange(osc.cwd);
    if (osc.title) this.opts.onTitleChange(osc.title);
    for (const n of osc.notifications)
      this.opts.onNotification(n.title, n.body);
  }
}
