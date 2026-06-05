import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  VscArrowLeft,
  VscArrowRight,
  VscChromeClose,
  VscLinkExternal,
  VscRefresh,
} from "react-icons/vsc";
import type { AppState } from "../../../shared/types";
import {
  type BrowserState,
  type BrowserSurface,
  defaultBrowserState,
} from "../../../shared/types";
import { useSurfaceLifecycle } from "../../app/surface-lifecycle";
import {
  clearBrowserFavicon,
  closeSurface,
  renameSurface,
  selectActiveWorkspace,
  setBrowserFavicon,
  setBrowserSurfaceUrl,
  unreadSurfaceIds,
  useWorkspaceStore,
} from "../../store";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import { forEachLeaf } from "../Layout/pane-tree";
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

function paneHasUnread(state: AppState, paneId: string): boolean {
  const ws = selectActiveWorkspace(state);
  if (!ws) return false;
  const unreadIds = unreadSurfaceIds(ws.notifications);
  if (unreadIds.size === 0) return false;
  let highlighted = false;
  forEachLeaf(ws.layout, (leaf) => {
    if (highlighted || leaf.id !== paneId) return;
    highlighted = leaf.surfaces.some((s) => unreadIds.has(s.id));
  });
  return highlighted;
}

export function BrowserPane({
  workspaceId,
  paneId,
  surface,
  isVisible,
}: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  // paneId can change when the surface is dragged to another pane; the rename
  // closure must address the current pane, not the one captured at mount
  const paneIdRef = useRef(paneId);
  paneIdRef.current = paneId;

  const [state, setState] = useState<BrowserState>(() =>
    defaultBrowserState(surface.url),
  );
  const [urlDraft, setUrlDraft] = useState<string | null>(null);

  const terminalTheme = useWorkspaceStore(
    (s) => TERMINAL_THEMES[s.appearance.terminalThemeId],
  );
  const uiScale = useWorkspaceStore((s) => s.appearance.uiScale);
  const isPaneHighlighted = useWorkspaceStore((s) => paneHasUnread(s, paneId));
  const isPaneHighlightedRef = useRef(isPaneHighlighted);
  isPaneHighlightedRef.current = isPaneHighlighted;
  const fg = terminalTheme.foreground;
  const navButtonStyle = useMemo(() => navButtonSx(fg), [fg]);
  const urlInputStyle = useMemo(() => urlInputSx(fg), [fg]);

  useEffect(() => {
    const id = surface.id;
    return () => clearBrowserFavicon(id);
  }, [surface.id]);

  const controllerRef = useSurfaceLifecycle<BrowserController>({
    paneId,
    isVisible,
    mountKey: `${surface.id}|${workspaceId}`,
    create: () => {
      const anchor = anchorRef.current;
      if (!anchor) throw new Error("BrowserPane anchor not mounted");
      const surfaceId = surface.id;
      return new BrowserController({
        surfaceId,
        url: surface.url,
        anchor,
        highlighted: isPaneHighlightedRef.current,
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: controllerRef is a stable ref
  useEffect(() => {
    controllerRef.current?.setHighlighted(isPaneHighlighted);
  }, [isPaneHighlighted]);

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
          title="Back"
          disabled={!state.canGoBack}
          onClick={() => controllerRef.current?.command("goBack")}
          sx={navButtonStyle}
        >
          <VscArrowLeft size={16} />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Forward"
          title="Forward"
          disabled={!state.canGoForward}
          onClick={() => controllerRef.current?.command("goForward")}
          sx={navButtonStyle}
        >
          <VscArrowRight size={16} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={state.isLoading ? "Stop" : "Reload"}
          title={state.isLoading ? "Stop" : "Reload"}
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
          value={urlDraft ?? state.url}
          onChange={(e) => setUrlDraft(e.target.value)}
          onFocus={(e) => {
            setUrlDraft(state.url);
            e.currentTarget.select();
          }}
          onBlur={() => setUrlDraft(null)}
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
