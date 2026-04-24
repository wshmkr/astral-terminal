import Box from "@mui/material/Box";
import { useEffect, useRef, useState } from "react";
import type { TerminalSurface } from "../../../shared/types";
import { loadAppConfig } from "../../app/config-loader";
import {
  addNotification,
  findWorkspaceIdForPane,
  getWorkspace,
  renameSurface,
  updateTerminalSurface,
} from "../../store";
import { FindBar } from "./FindBar";
import { preloadTerminalFont, TerminalController } from "./terminal-lifecycle";
import "@xterm/xterm/css/xterm.css";

const BRANCH_REFRESH_DEBOUNCE_MS = 500;

interface Props {
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

export function TerminalPane({ paneId, surface, isVisible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<TerminalController | null>(null);
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;
  const [findOpen, setFindOpen] = useState(false);
  // Lifted so Ctrl+F can refocus when the bar is already open
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let clearDebounce: (() => void) | null = null;
    const surfaceId = surface.id;
    const { startupCommand, cwd } = surfaceRef.current;

    Promise.all([loadAppConfig(), preloadTerminalFont()]).then(([config]) => {
      if (disposed) return;
      const wsId = findWorkspaceIdForPane(paneId);
      if (!wsId) return;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let fetchInFlight: Promise<unknown> | null = null;

      const runBranchRefresh = () => {
        if (fetchInFlight) return;
        const live = surfaceRef.current;
        const target = live.agentCwd || live.cwd;
        if (!target || target === "~") {
          if (live.branch !== undefined) {
            updateTerminalSurface(wsId, paneId, surfaceId, {
              branch: undefined,
            });
          }
          return;
        }
        fetchInFlight = window.app
          .getGitBranch(target)
          .then((next) => {
            if (disposed) return;
            const current = surfaceRef.current.branch;
            if (current !== next) {
              updateTerminalSurface(wsId, paneId, surfaceId, { branch: next });
            }
          })
          .finally(() => {
            fetchInFlight = null;
          });
      };

      const scheduleBranchRefresh = () => {
        if (disposed) return;
        if (debounceTimer !== null) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          runBranchRefresh();
        }, BRANCH_REFRESH_DEBOUNCE_MS);
      };

      controllerRef.current = new TerminalController({
        container,
        config,
        surfaceId,
        cwd,
        startupCommand,
        getLiveSurface: () => surfaceRef.current,
        onCwdChange: (next) => {
          updateTerminalSurface(wsId, paneId, surfaceId, {
            cwd: next,
            agentCwd: undefined,
          });
          scheduleBranchRefresh();
        },
        onAgentCwdChange: (next) => {
          updateTerminalSurface(wsId, paneId, surfaceId, {
            agentCwd: next ?? undefined,
          });
          scheduleBranchRefresh();
        },
        onActivity: scheduleBranchRefresh,
        onTitleChange: (title) => renameSurface(wsId, paneId, surfaceId, title),
        onNotification: (title, body) => {
          const resolved = title ?? getWorkspace(wsId)?.name ?? "Notification";
          addNotification(wsId, paneId, surfaceId, resolved, body);
        },
        onRequestFind: () => {
          setFindOpen(true);
          findInputRef.current?.focus();
          findInputRef.current?.select();
        },
      });

      runBranchRefresh();

      clearDebounce = () => {
        if (debounceTimer !== null) clearTimeout(debounceTimer);
      };
    });

    return () => {
      disposed = true;
      clearDebounce?.();
      controllerRef.current?.dispose();
      controllerRef.current = null;
      setFindOpen(false);
    };
  }, [surface.id, paneId]);

  useEffect(() => {
    if (!isVisible) return;
    requestAnimationFrame(() => controllerRef.current?.fit());
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || findOpen) return;
    requestAnimationFrame(() => controllerRef.current?.focus());
  }, [isVisible, findOpen]);

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
