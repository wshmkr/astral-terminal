import Box from "@mui/material/Box";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TerminalSurface } from "../../../shared/types";
import { loadAppConfig } from "../../app/config-loader";
import { useSurfaceLifecycle } from "../../app/surface-lifecycle";
import {
  addNotification,
  getState,
  getWorkspace,
  renameSurface,
  setFocusedPane,
  updateTerminalSurface,
  useWorkspaceStore,
} from "../../store";
import { FONT_BY_ID } from "../../theme/fonts";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import { FindBar } from "../Find/FindBar";
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
  const lineHeight = useWorkspaceStore((s) => s.appearance.terminalLineHeight);
  const uiScale = useWorkspaceStore((s) => s.appearance.uiScale);

  const canFocus = useCallback(() => !findOpen, [findOpen]);

  const mountKey = `${surface.id}|${workspaceId}`;

  const controllerRef = useSurfaceLifecycle<TerminalController>({
    paneId,
    isVisible,
    mountKey,
    canFocus,
    create: async (signal) => {
      const container = containerRef.current;
      if (!container) throw new Error("TerminalPane container not mounted");
      const surfaceId = surface.id;
      const { cwd } = surfaceRef.current;
      const initial = getState().appearance;
      const initialFont = FONT_BY_ID[initial.fontFamily];
      const [config] = await Promise.all([
        loadAppConfig(),
        preloadFont(initialFont.stack, initial.fontSize),
      ]);
      if (signal.aborted) throw new Error("aborted");
      return new TerminalController({
        container,
        config,
        theme: TERMINAL_THEMES[initial.terminalThemeId],
        fontFamily: initialFont.stack,
        fontSize: initial.fontSize,
        lineHeight: initial.terminalLineHeight,
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
        onSelect: () => setFocusedPane(paneIdRef.current),
      });
    },
  });

  // Close find bar when the controller is recreated for a different surface
  // biome-ignore lint/correctness/useExhaustiveDependencies: mountKey is the remount trigger we want to react to
  useEffect(() => () => setFindOpen(false), [mountKey]);

  useEffect(() => {
    controllerRef.current?.setTheme(TERMINAL_THEMES[terminalThemeId]);
  }, [terminalThemeId, controllerRef]);

  useEffect(() => {
    const font = FONT_BY_ID[fontFamilyId];
    preloadFont(font.stack, fontSize)
      .catch((err) => console.warn("Font preload failed:", err))
      .finally(() => controllerRef.current?.setFont(font.stack, fontSize));
  }, [fontFamilyId, fontSize, controllerRef]);

  useEffect(() => {
    controllerRef.current?.setLineHeight(lineHeight);
  }, [lineHeight, controllerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.zoom = String(1 / uiScale);
    if (!isVisible) return;
    requestAnimationFrame(() => controllerRef.current?.fit());
  }, [uiScale, isVisible, controllerRef]);

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
