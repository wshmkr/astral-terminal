import { useEffect, useRef } from "react";
import type { TerminalSurface } from "../../../shared/types";
import { loadAppConfig } from "../../app/config-loader";
import {
  addNotification,
  findWorkspaceIdForPane,
  getWorkspace,
  renameSurface,
  updateTerminalSurface,
} from "../../store";
import { preloadTerminalFont, TerminalController } from "./terminal-lifecycle";
import "@xterm/xterm/css/xterm.css";

const BRANCH_REFRESH_DEBOUNCE_MS = 500;

interface Props {
  paneId: string;
  surface: TerminalSurface;
  isVisible: boolean;
}

export function TerminalPane({ paneId, surface, isVisible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<TerminalController | null>(null);
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

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
    };
  }, [surface.id, paneId]);

  useEffect(() => {
    if (!isVisible) return;
    requestAnimationFrame(() => {
      const c = controllerRef.current;
      if (!c) return;
      c.fit();
      c.focus();
    });
  }, [isVisible]);

  return <div className="terminal-container" ref={containerRef} />;
}
