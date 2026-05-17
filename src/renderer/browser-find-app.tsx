import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AppearanceSettings,
  BrowserFindOptions,
  BrowserFindResult,
} from "../shared/types";
import type { FindController, FindMatches } from "./components/Find/FindBar";
import { FindBar } from "./components/Find/FindBar";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "./store/appearance";
import { buildTheme, resolveColorScheme } from "./theme";
import { resolveAccentHex } from "./theme/accent-colors";

class BrowserFindController implements FindController {
  private listeners = new Set<(m: FindMatches | undefined) => void>();
  private lastQuery = "";
  private lastCaseSensitive = false;
  private unsubscribe: () => void;

  constructor(private readonly surfaceId: string) {
    this.unsubscribe = window.app.onBrowserFindResult((result) => {
      this.emit(result);
    });
  }

  findNext(query: string, caseSensitive: boolean): void {
    this.send(query, caseSensitive, true);
  }

  findPrevious(query: string, caseSensitive: boolean): void {
    this.send(query, caseSensitive, false);
  }

  clearFind(): void {
    this.lastQuery = "";
    window.app.browserFindStop(this.surfaceId);
    this.listeners.forEach((cb) => {
      cb(undefined);
    });
  }

  onFindResults(cb: (m: FindMatches | undefined) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  dispose(): void {
    this.unsubscribe();
    this.listeners.clear();
  }

  private send(query: string, caseSensitive: boolean, forward: boolean): void {
    const sameSearch =
      query === this.lastQuery && caseSensitive === this.lastCaseSensitive;
    const opts: BrowserFindOptions = {
      text: query,
      forward,
      matchCase: caseSensitive,
      findNext: sameSearch,
    };
    this.lastQuery = query;
    this.lastCaseSensitive = caseSensitive;
    window.app.browserFindRequest(this.surfaceId, opts);
  }

  private emit(result: BrowserFindResult): void {
    if (!result.finalUpdate) return;
    const matches: FindMatches = {
      resultIndex: Math.max(0, result.activeMatchOrdinal - 1),
      resultCount: result.matches,
    };
    this.listeners.forEach((cb) => {
      cb(matches);
    });
  }
}

const ROOT_STYLE: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  containerType: "inline-size",
};

export function BrowserFindApp() {
  const [appearance, setAppearance] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [surfaceId, setSurfaceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void window.app.readSettings().then((s) => {
      setAppearance(normalizeAppearance(s?.appearance));
    });
  }, []);

  useEffect(
    () =>
      window.app.onBrowserFindTargetChanged((payload) => {
        setSurfaceId(payload.surfaceId);
        queueMicrotask(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.app.closeBrowserFindWindow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const controller = useMemo<BrowserFindController | null>(
    () => (surfaceId == null ? null : new BrowserFindController(surfaceId)),
    [surfaceId],
  );

  useEffect(() => {
    return () => controller?.dispose();
  }, [controller]);

  const theme = useMemo(
    () => buildTheme(resolveAccentHex(appearance.accentColorId), appearance.appThemeId),
    [appearance.accentColorId, appearance.appThemeId],
  );

  return (
    <ThemeProvider theme={theme} defaultMode={resolveColorScheme(appearance.appThemeId)}>
      <CssBaseline />
      <div style={ROOT_STYLE}>
        {controller && (
          <FindBar
            controller={controller}
            inputRef={inputRef}
            onClose={() => window.app.closeBrowserFindWindow()}
            variant="embedded"
          />
        )}
      </div>
    </ThemeProvider>
  );
}
