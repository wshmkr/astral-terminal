import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";
import { useEffect, useRef, useState } from "react";
import {
  VscArrowLeft,
  VscArrowRight,
  VscChromeClose,
  VscRefresh,
} from "react-icons/vsc";
import type { BrowserState, BrowserSurface } from "../../../shared/types";
import { renameSurface, useWorkspaceStore } from "../../store";
import { BrowserController } from "./browser-lifecycle";

interface Props {
  workspaceId: string;
  paneId: string;
  surface: BrowserSurface;
  isVisible: boolean;
}

const ROOT_SX = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
} as const;

const TOOLBAR_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  px: 0.75,
  py: 0.5,
  bgcolor: "background.paper",
  borderBottom: "1px solid",
  borderColor: "divider",
  flex: "0 0 auto",
} as const;

const NAV_BUTTON_SX = {
  width: 28,
  height: 28,
  borderRadius: 1,
} as const;

const URL_INPUT_SX = {
  flex: 1,
  bgcolor: "action.hover",
  borderRadius: 1.5,
  px: 1.25,
  py: 0.25,
  fontSize: 13,
  color: "text.primary",
  "& input": {
    p: 0,
    height: 24,
  },
  "&:focus-within": {
    bgcolor: "action.selected",
  },
} as const;

const ANCHOR_SX = {
  flex: 1,
  minHeight: 0,
} as const;

function defaultState(initialUrl: string): BrowserState {
  return {
    url: initialUrl,
    title: "",
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  };
}

export function BrowserPane({
  workspaceId,
  paneId,
  surface,
  isVisible,
}: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<BrowserController | null>(null);
  // paneId can change when the surface is dragged to another pane; store
  // callbacks must address the current pane, not the one captured at mount
  const paneIdRef = useRef(paneId);
  paneIdRef.current = paneId;

  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);

  const [state, setState] = useState<BrowserState>(() =>
    defaultState(surface.initialUrl),
  );
  const [urlDraft, setUrlDraft] = useState<string | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const surfaceId = surface.id;
    const controller = new BrowserController({
      surfaceId,
      initialUrl: surface.initialUrl,
      anchor,
      onState: (next) => {
        setState(next);
        if (next.title) {
          renameSurface(workspaceId, paneIdRef.current, surfaceId, next.title);
        }
      },
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [surface.id, surface.initialUrl, workspaceId]);

  useEffect(() => {
    controllerRef.current?.setVisible(isVisible);
  }, [isVisible]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: paneId change reparents the slot; re-measure to follow
  useEffect(() => {
    if (!isVisible) return;
    requestAnimationFrame(() => controllerRef.current?.syncBoundsNow());
  }, [isVisible, paneId]);

  useEffect(() => {
    if (!isVisible) return;
    if (focusedPaneId !== paneId) return;
    controllerRef.current?.focus();
  }, [isVisible, focusedPaneId, paneId]);

  const submitUrl = () => {
    const draft = urlDraft;
    if (draft == null) return;
    setUrlDraft(null);
    const target = draft.trim();
    if (!target) return;
    controllerRef.current?.loadURL(target);
  };

  const reloadOrStop = () => {
    if (state.isLoading) controllerRef.current?.stop();
    else controllerRef.current?.reload();
  };

  return (
    <Box sx={ROOT_SX}>
      <Box sx={TOOLBAR_SX}>
        <Tooltip title="Back">
          <span>
            <IconButton
              size="small"
              disabled={!state.canGoBack}
              onClick={() => controllerRef.current?.goBack()}
              sx={NAV_BUTTON_SX}
            >
              <VscArrowLeft size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Forward">
          <span>
            <IconButton
              size="small"
              disabled={!state.canGoForward}
              onClick={() => controllerRef.current?.goForward()}
              sx={NAV_BUTTON_SX}
            >
              <VscArrowRight size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={state.isLoading ? "Stop" : "Reload"}>
          <IconButton size="small" onClick={reloadOrStop} sx={NAV_BUTTON_SX}>
            {state.isLoading ? (
              <VscChromeClose size={16} />
            ) : (
              <VscRefresh size={16} />
            )}
          </IconButton>
        </Tooltip>
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
      </Box>
      <Box ref={anchorRef} sx={ANCHOR_SX} />
    </Box>
  );
}
