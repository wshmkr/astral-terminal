import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  VscArrowLeft,
  VscArrowRight,
  VscChromeClose,
  VscLinkExternal,
  VscRefresh,
} from "react-icons/vsc";
import {
  type BrowserState,
  type BrowserSurface,
  defaultBrowserState,
} from "../../../shared/types";
import { useSurfaceLifecycle } from "../../app/surface-lifecycle";
import { commandTitle } from "../../keybindings/shortcutHint";
import {
  clearBrowserFavicon,
  closeSurface,
  consumeBrowserUrlFocus,
  renameSurface,
  setBrowserFavicon,
  setBrowserSurfaceUrl,
  useWorkspaceStore,
} from "../../store";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import {
  ANCHOR_SX,
  navButtonSx,
  ROOT_SX,
  TOOLBAR_SX,
  urlInputSx,
} from "./BrowserPane.styles";
import { BrowserController } from "./browser-lifecycle";

interface Props {
  workspaceId: string;
  paneId: string;
  surface: BrowserSurface;
  isVisible: boolean;
}

export function BrowserPane({
  workspaceId,
  paneId,
  surface,
  isVisible,
}: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  // paneId can change when the surface is dragged to another pane; the rename
  // closure must address the current pane, not the one captured at mount
  const paneIdRef = useRef(paneId);
  paneIdRef.current = paneId;

  const [state, setState] = useState<BrowserState>(() =>
    defaultBrowserState(surface.url),
  );
  const [urlDraft, setUrlDraft] = useState<string | null>(null);
  // A freshly opened browser tab focuses the URL bar and suppresses the page
  // auto-focus until the user leaves the address bar, so they can type a URL
  const [freshTab, setFreshTab] = useState(() =>
    consumeBrowserUrlFocus(surface.id),
  );
  const canFocus = useCallback(() => !freshTab, [freshTab]);

  const terminalTheme = useWorkspaceStore(
    (s) => TERMINAL_THEMES[s.appearance.terminalThemeId],
  );
  const uiScale = useWorkspaceStore((s) => s.appearance.uiScale);
  const fg = terminalTheme.foreground;
  const navButtonStyle = useMemo(() => navButtonSx(fg), [fg]);
  const urlInputStyle = useMemo(() => urlInputSx(fg), [fg]);

  useEffect(() => {
    const id = surface.id;
    return () => clearBrowserFavicon(id);
  }, [surface.id]);

  useEffect(() => {
    const id = surface.id;
    return window.app.onBrowserFocusAddressBar(({ surfaceId }) => {
      if (surfaceId === id) urlInputRef.current?.focus();
    });
  }, [surface.id]);

  useEffect(() => {
    if (freshTab) urlInputRef.current?.focus();
  }, [freshTab]);

  const controllerRef = useSurfaceLifecycle<BrowserController>({
    paneId,
    isVisible,
    canFocus,
    mountKey: `${surface.id}|${workspaceId}`,
    create: () => {
      const anchor = anchorRef.current;
      if (!anchor) throw new Error("BrowserPane anchor not mounted");
      const surfaceId = surface.id;
      return new BrowserController({
        surfaceId,
        url: surface.url,
        anchor,
        onState: (next) => {
          setState(next);
          setBrowserFavicon(surfaceId, next.favicon);
          if (next.title) {
            renameSurface(
              workspaceId,
              paneIdRef.current,
              surfaceId,
              next.title,
            );
          }
          if (next.url && next.url !== "about:blank") {
            setBrowserSurfaceUrl(
              workspaceId,
              paneIdRef.current,
              surfaceId,
              next.url,
            );
          }
        },
      });
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: controllerRef is a stable ref
  useEffect(() => {
    controllerRef.current?.remeasure();
  }, [uiScale]);

  const submitUrl = () => {
    const draft = urlDraft;
    if (draft == null) return;
    setUrlDraft(null);
    const target = draft.trim();
    if (!target) return;
    controllerRef.current?.loadURL(target);
  };

  const reloadOrStop = () => {
    controllerRef.current?.command(state.isLoading ? "stop" : "reload");
  };

  return (
    <Box sx={ROOT_SX}>
      <Box
        sx={[
          TOOLBAR_SX,
          {
            bgcolor: terminalTheme.background,
            color: terminalTheme.foreground,
          },
        ]}
      >
        <IconButton
          size="small"
          aria-label="Back"
          title={commandTitle("Back", "browser.back")}
          disabled={!state.canGoBack}
          onClick={() => controllerRef.current?.command("goBack")}
          sx={navButtonStyle}
        >
          <VscArrowLeft size={16} />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Forward"
          title={commandTitle("Forward", "browser.forward")}
          disabled={!state.canGoForward}
          onClick={() => controllerRef.current?.command("goForward")}
          sx={navButtonStyle}
        >
          <VscArrowRight size={16} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={state.isLoading ? "Stop" : "Reload"}
          title={
            state.isLoading ? "Stop" : commandTitle("Reload", "browser.reload")
          }
          onClick={reloadOrStop}
          sx={navButtonStyle}
        >
          {state.isLoading ? (
            <VscChromeClose size={16} />
          ) : (
            <VscRefresh size={16} />
          )}
        </IconButton>
        <InputBase
          inputRef={urlInputRef}
          value={urlDraft ?? state.url}
          onChange={(e) => setUrlDraft(e.target.value)}
          onFocus={(e) => {
            setUrlDraft(state.url);
            const input = e.currentTarget;
            requestAnimationFrame(() => input.select());
          }}
          onBlur={() => {
            setUrlDraft(null);
            setFreshTab(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitUrl();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setUrlDraft(null);
              (e.target as HTMLInputElement).blur();
            }
          }}
          spellCheck={false}
          sx={urlInputStyle}
        />
        <IconButton
          size="small"
          aria-label="Open in external browser"
          title="Open in external browser"
          disabled={!state.url || state.url === "about:blank"}
          onClick={() => {
            window.app.openExternal(state.url);
            closeSurface(paneIdRef.current, surface.id);
          }}
          sx={navButtonStyle}
        >
          <VscLinkExternal size={16} />
        </IconButton>
      </Box>
      <Box ref={anchorRef} sx={ANCHOR_SX} />
    </Box>
  );
}
