import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import { useRef, useState } from "react";
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
import {
  closeSurface,
  renameSurface,
  setBrowserSurfaceUrl,
  useWorkspaceStore,
} from "../../store";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import {
  ANCHOR_SX,
  NAV_BUTTON_SX,
  ROOT_SX,
  TOOLBAR_SX,
  URL_INPUT_SX,
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
        onState: (next) => {
          setState(next);
          if (next.title) {
            renameSurface(
              workspaceId,
              paneIdRef.current,
              surfaceId,
              `🌐︎ ${next.title}`,
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
          sx={NAV_BUTTON_SX}
        >
          <VscArrowLeft size={16} />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Forward"
          title="Forward"
          disabled={!state.canGoForward}
          onClick={() => controllerRef.current?.command("goForward")}
          sx={NAV_BUTTON_SX}
        >
          <VscArrowRight size={16} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={state.isLoading ? "Stop" : "Reload"}
          title={state.isLoading ? "Stop" : "Reload"}
          onClick={reloadOrStop}
          sx={NAV_BUTTON_SX}
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
          sx={URL_INPUT_SX}
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
          sx={NAV_BUTTON_SX}
        >
          <VscLinkExternal size={16} />
        </IconButton>
      </Box>
      <Box ref={anchorRef} sx={ANCHOR_SX} />
    </Box>
  );
}
