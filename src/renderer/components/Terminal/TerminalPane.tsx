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
    const surfaceId = surface.id;
    const { startupCommand, cwd } = surfaceRef.current;

    Promise.all([loadAppConfig(), preloadTerminalFont()]).then(([config]) => {
      if (disposed) return;
      const wsId = findWorkspaceIdForPane(paneId);
      if (!wsId) return;

      controllerRef.current = new TerminalController({
        container,
        config,
        surfaceId,
        cwd,
        startupCommand,
        getLiveSurface: () => surfaceRef.current,
        onCwdChange: (next) =>
          updateTerminalSurface(wsId, paneId, surfaceId, { cwd: next }),
        onTitleChange: (title) => renameSurface(wsId, paneId, surfaceId, title),
        onNotification: (title, body) => {
          const resolved = title ?? getWorkspace(wsId)?.name ?? "Notification";
          addNotification(wsId, paneId, surfaceId, resolved, body);
        },
      });
    });

    return () => {
      disposed = true;
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
