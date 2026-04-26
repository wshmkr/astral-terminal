import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { agentProviders } from "../shared/agent-hooks";
import { loadAppConfig } from "./app/config-loader";
import { findLeafPane } from "./components/Layout/pane-tree";
import { WorkspaceLayout } from "./components/Layout/WorkspaceLayout";
import { playNotificationSound } from "./components/Sidebar/notification-sound";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { TitleBar } from "./components/ui/TitleBar";
import { useKeyboard } from "./hooks/useKeyboard";
import {
  formatNotificationDisplay,
  getState,
  onNotificationAdded,
  setActiveSurface,
  setActiveWorkspace,
  setTerminalBackground,
  setWindowFocused,
  useWorkspaceStore,
} from "./store";

export function App() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspacesContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useKeyboard();

  useEffect(() => {
    const el = workspacesContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize((prev) => {
          const w = Math.round(width);
          const h = Math.round(height);
          if (prev && prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
      }
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadAppConfig().then((config) =>
      setTerminalBackground(config.terminalTheme.background),
    );
  }, []);

  useEffect(() => {
    const onFocus = () => setWindowFocused(true);
    const onBlur = () => setWindowFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    const cleanupClick = window.app.onNotificationClick(
      ({ workspaceId, paneId, surfaceId }) => {
        setActiveWorkspace(workspaceId);
        setActiveSurface(paneId, surfaceId);
      },
    );
    const cleanupAdded = onNotificationAdded((notif) => {
      const s = getState();
      playNotificationSound({
        enabled: s.notificationSettings.soundEnabled,
      });
      const sourceWs = s.workspaces.find((w) => w.id === notif.workspaceId);
      const focusedSurfaceId =
        sourceWs && s.focusedPaneId
          ? (findLeafPane(sourceWs.layout, s.focusedPaneId)?.activeSurfaceId ??
            null)
          : null;
      const isFocusedTarget =
        s.activeWorkspaceId === notif.workspaceId &&
        s.focusedPaneId === notif.paneId &&
        focusedSurfaceId === notif.surfaceId &&
        s.windowFocused;
      if (s.notificationSettings.osNotificationsEnabled && !isFocusedTarget) {
        const display = formatNotificationDisplay(notif);
        window.app.fireNotification({
          workspaceId: notif.workspaceId,
          paneId: notif.paneId,
          surfaceId: notif.surfaceId,
          title: display.title,
          body: display.body,
        });
      }
    });
    return () => {
      cleanupClick();
      cleanupAdded();
    };
  }, []);

  useEffect(() => {
    for (const provider of agentProviders) {
      (async () => {
        try {
          const detected = await window.app.detectAgentHooks({
            providerName: provider.name,
          });
          if (!detected) return;
          const result = await window.app.configureAgentHooks({
            providerName: provider.name,
          });
          if (result.status === "configured") {
            console.log(`Configured ${provider.name} notification hooks`);
          } else if (result.status === "error") {
            console.error(
              `Failed to configure ${provider.name} notification hooks:`,
              result.message,
            );
          }
        } catch (err) {
          console.error(
            `Failed to configure ${provider.name} notification hooks:`,
            err,
          );
        }
      })();
    }
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
      }}
    >
      <TitleBar />
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <Box
          ref={workspacesContainerRef}
          sx={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {workspaces.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                width: "100%",
                userSelect: "none",
              }}
            >
              <Typography variant="h5" color="text.disabled">
                No workspace open.
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.disabled", opacity: 0.8 }}
              >
                press Ctrl+Shift+T to create one
              </Typography>
            </Box>
          ) : (
            workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              return (
                <Box
                  key={ws.id}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    visibility: isActive ? "visible" : "hidden",
                    zIndex: isActive ? 1 : 0,
                  }}
                >
                  {containerSize && (
                    <WorkspaceLayout
                      layout={ws.layout}
                      containerSize={containerSize}
                    />
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
}
