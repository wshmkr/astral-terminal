import { FitAddon } from "@xterm/addon-fit";
import {
  type ISearchDecorationOptions,
  SearchAddon,
} from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { windowsPtyOptions } from "../../../shared/pty-options";
import type { AppConfig, TerminalTheme } from "../../../shared/types";
import { parseOsc } from "./osc";

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

function createTerminal(
  container: HTMLElement,
  opts: {
    config: AppConfig;
    theme: TerminalTheme;
    fontFamily: string;
    fontSize: number;
  },
): TerminalAddons {
  container.style.backgroundColor = opts.theme.background;

  const term = new Terminal({
    fontFamily: opts.fontFamily,
    fontSize: opts.fontSize,
    lineHeight: 1.2,
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
  term.loadAddon(new WebLinksAddon());

  term.open(container);
  return { term, fitAddon, searchAddon };
}

function attachClipboardHandlers(
  term: Terminal,
  container: HTMLElement,
  getPtyId: () => string | null,
  onRequestFind: () => void,
): () => void {
  const pasteFromClipboard = () => {
    navigator.clipboard
      .readText()
      .then((text) => {
        const id = getPtyId();
        if (text && id) window.app.writePty(id, text);
      })
      .catch((err) => {
        console.warn("Clipboard read failed:", err);
      });
  };

  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== "keydown") return true;
    if (e.ctrlKey && e.shiftKey && e.key === "C") {
      e.preventDefault();
      const sel = term.getSelection();
      if (sel) navigator.clipboard.writeText(sel);
      return false;
    }
    if (e.ctrlKey && e.shiftKey && e.key === "V") {
      e.preventDefault();
      pasteFromClipboard();
      return false;
    }
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      onRequestFind();
      return false;
    }
    if (e.key === "ScrollLock") return false;
    return true;
  });

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const sel = term.getSelection();
    if (sel) {
      navigator.clipboard.writeText(sel);
      term.clearSelection();
    } else {
      pasteFromClipboard();
    }
  };
  container.addEventListener("contextmenu", onContextMenu);

  return () => container.removeEventListener("contextmenu", onContextMenu);
}

export interface TerminalControllerOptions {
  container: HTMLElement;
  config: AppConfig;
  theme: TerminalTheme;
  fontFamily: string;
  fontSize: number;
  surfaceId: string;
  cwd: string;
  getLiveSurface: () => { cwd: string };
  onCwdChange: (cwd: string) => void;
  onTitleChange: (title: string) => void;
  onNotification: (title: string | undefined, body: string | undefined) => void;
  onRequestFind: () => void;
}

export interface FindMatches {
  resultIndex: number;
  resultCount: number;
}

export class TerminalController {
  readonly term: Terminal;
  private readonly fitAddon: FitAddon;
  private readonly searchAddon: SearchAddon;
  private readonly findDecorations: ISearchDecorationOptions;
  private readonly resizeObserver: ResizeObserver;
  private readonly cleanupFns: Array<() => void> = [];
  private readonly container: HTMLElement;

  private ptyId: string | null = null;
  private disposed = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private preReplayBuffer: string[] | null = [];

  constructor(private readonly opts: TerminalControllerOptions) {
    this.container = opts.container;
    const { term, fitAddon, searchAddon } = createTerminal(opts.container, {
      config: opts.config,
      theme: opts.theme,
      fontFamily: opts.fontFamily,
      fontSize: opts.fontSize,
    });
    this.term = term;
    this.fitAddon = fitAddon;
    this.searchAddon = searchAddon;
    this.findDecorations = findDecorationsFromTheme(opts.theme);

    this.cleanupFns.push(
      attachClipboardHandlers(
        term,
        opts.container,
        () => this.ptyId,
        opts.onRequestFind,
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

  focus(): void {
    this.term.focus();
  }

  setTheme(theme: TerminalTheme): void {
    if (this.disposed) return;
    this.term.options.theme = theme;
    this.container.style.backgroundColor = theme.background;
    Object.assign(this.findDecorations, findDecorationsFromTheme(theme));
  }

  setFont(fontFamily: string, fontSize: number): void {
    if (this.disposed) return;
    this.term.options.fontFamily = fontFamily;
    this.term.options.fontSize = fontSize;
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
    const container = this.container;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return;
    const proposed = this.fitAddon.proposeDimensions();
    if (!proposed) return;
    if (proposed.cols === this.term.cols && proposed.rows === this.term.rows)
      return;
    this.fitAddon.fit();
  }

  private async startPty(): Promise<void> {
    const id = await window.app.createPty({
      cwd: this.opts.cwd,
      surfaceId: this.opts.surfaceId,
    });
    if (this.disposed) {
      window.app.killPty(id);
      return;
    }
    this.ptyId = id;

    this.cleanupFns.push(
      window.app.onPtyData(id, (data) => this.onPtyData(data)),
      window.app.onPtyExit(id, () => {
        if (this.disposed) return;
        this.term.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
      }),
    );

    const replay = await window.app.replayPty(id);
    if (this.disposed) return;
    if (replay) this.term.write(replay);

    const buffered = this.preReplayBuffer ?? [];
    this.preReplayBuffer = null;
    for (const chunk of buffered) this.onPtyData(chunk);

    this.term.onData((data) => window.app.writePty(id, data));
    this.term.onResize(({ cols, rows }) =>
      window.app.resizePty(id, cols, rows),
    );

    this.safeFit();
    window.app.resizePty(id, this.term.cols, this.term.rows);
    this.term.focus();
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
