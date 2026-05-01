import Box from "@mui/material/Box";
import { useEffect, useRef, useState } from "react";
import type { TerminalSurface } from "../../../shared/types";
import { loadAppConfig } from "../../app/config-loader";
import {
  addNotification,
  getState,
  getWorkspace,
  renameSurface,
  updateTerminalSurface,
  useWorkspaceStore,
} from "../../store";
import { FONT_BY_ID } from "../../theme/fonts";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import { FindBar } from "./FindBar";
import { preloadFont, TerminalController } from "./terminal-lifecycle";
import "@xterm/xterm/css/xterm.css";

interface Props {
  workspaceId: string;
  paneId: string;
  surface: TerminalSurface;
  isVisible: boolean;
}

const WRAPPER_SX = {
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  containerType: "inline-size",
} as const;

export function TerminalPane({
  workspaceId,
  paneId,
  surface,
  isVisible,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<TerminalController | null>(null);
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;
  // paneId can change when the surface is dragged to another pane; store
  // callbacks must address the current pane, not the one captured at mount
  const paneIdRef = useRef(paneId);
  paneIdRef.current = paneId;
  const [findOpen, setFindOpen] = useState(false);
  // Lifted so Ctrl+F can refocus when the bar is already open
  const findInputRef = useRef<HTMLInputElement>(null);

  const terminalThemeId = useWorkspaceStore(
    (s) => s.appearance.terminalThemeId,
  );
  const fontFamilyId = useWorkspaceStore((s) => s.appearance.fontFamily);
  const fontSize = useWorkspaceStore((s) => s.appearance.fontSize);
  const uiScale = useWorkspaceStore((s) => s.appearance.uiScale);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    const surfaceId = surface.id;
    const { cwd } = surfaceRef.current;
    const initial = getState().appearance;
    const initialFont = FONT_BY_ID[initial.fontFamily];

    Promise.all([
      loadAppConfig(),
      preloadFont(initialFont.stack, initial.fontSize),
    ]).then(([config]) => {
      if (disposed) return;

      controllerRef.current = new TerminalController({
        container,
        config,
        theme: TERMINAL_THEMES[initial.terminalThemeId],
        fontFamily: initialFont.stack,
        fontSize: initial.fontSize,
        surfaceId,
        cwd,
        getLiveSurface: () => surfaceRef.current,
        onCwdChange: (next) =>
          updateTerminalSurface(workspaceId, paneIdRef.current, surfaceId, {
            cwd: next,
          }),
        onTitleChange: (title) =>
          renameSurface(workspaceId, paneIdRef.current, surfaceId, title),
        onNotification: (title, body) => {
          const resolved =
            title ?? getWorkspace(workspaceId)?.name ?? "Notification";
          addNotification(
            workspaceId,
            paneIdRef.current,
            surfaceId,
            resolved,
            body,
          );
        },
        onRequestFind: () => {
          setFindOpen(true);
          findInputRef.current?.focus();
          findInputRef.current?.select();
        },
      });
    });

    return () => {
      disposed = true;
      controllerRef.current?.dispose();
      controllerRef.current = null;
      setFindOpen(false);
    };
  }, [surface.id, workspaceId]);

  useEffect(() => {
    controllerRef.current?.setTheme(TERMINAL_THEMES[terminalThemeId]);
  }, [terminalThemeId]);

  useEffect(() => {
    const font = FONT_BY_ID[fontFamilyId];
    preloadFont(font.stack, fontSize)
      .catch((err) => console.warn("Font preload failed:", err))
      .finally(() => controllerRef.current?.setFont(font.stack, fontSize));
  }, [fontFamilyId, fontSize]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: paneId is a re-fit trigger — the slot moves to a different surface body when paneId changes, so xterm needs to re-measure
  useEffect(() => {
    if (!isVisible) return;
    requestAnimationFrame(() => controllerRef.current?.fit());
  }, [isVisible, paneId]);

  useEffect(() => {
    if (!isVisible || findOpen) return;
    requestAnimationFrame(() => controllerRef.current?.focus());
  }, [isVisible, findOpen]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.zoom = String(1 / uiScale);
    if (!isVisible) return;
    requestAnimationFrame(() => controllerRef.current?.fit());
  }, [uiScale, isVisible]);

  const closeFind = () => setFindOpen(false);

  return (
    <Box sx={WRAPPER_SX}>
      <div className="terminal-container" ref={containerRef} />
      {findOpen && controllerRef.current && (
        <FindBar
          controller={controllerRef.current}
          onClose={closeFind}
          inputRef={findInputRef}
        />
      )}
    </Box>
  );
}
