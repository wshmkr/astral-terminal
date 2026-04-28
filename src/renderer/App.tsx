import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { agentProviders } from "../shared/agent-hooks";
import { WorkspaceLayout } from "./components/Layout/WorkspaceLayout";
import { SettingsDialog } from "./components/Settings/SettingsDialog";
import { playNotificationSound } from "./components/Sidebar/notification-sound";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { TitleBar } from "./components/ui/TitleBar";
import { useKeyboard } from "./hooks/useKeyboard";
import {
  formatNotificationDisplay,
  getState,
  isUserActivelyViewing,
  onNotificationAdded,
  setActiveSurface,
  setActiveWorkspace,
  setAgentHook,
  setSettingsOpen,
  setWindowFocused,
  useWorkspaceStore,
} from "./store";

export function App() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const appThemeId = useWorkspaceStore((s) => s.appearance.appThemeId);
  const settingsOpen = useWorkspaceStore((s) => s.settingsOpen);
  const workspacesContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useKeyboard();

  const uiScale = useWorkspaceStore((s) => s.appearance.uiScale);
  const { setMode } = useColorScheme();

  useEffect(() => {
    setMode(appThemeId);
  }, [appThemeId, setMode]);

  useEffect(() => {
    window.app.setUiZoom(uiScale);
  }, [uiScale]);

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
    return window.app.onNotificationClick(
      ({ workspaceId, paneId, surfaceId }) => {
        setActiveWorkspace(workspaceId);
        setActiveSurface(paneId, surfaceId);
      },
    );
  }, []);

  useEffect(() => {
    return onNotificationAdded((notif) => {
      const s = getState();
      playNotificationSound({ enabled: s.notificationSettings.soundEnabled });
      const isFocusedTarget = isUserActivelyViewing(
        notif.workspaceId,
        notif.paneId,
        notif.surfaceId,
      );
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
  }, []);

  useEffect(() => {
    const enabled = getState().notificationSettings.agentHooks;
    for (const provider of agentProviders) {
      const setting = enabled[provider.name];
      if (setting === undefined) continue;
      setAgentHook(provider.name, setting)
        .then((result) => {
          if (result.status === "configured") {
            console.log(`Configured ${provider.name} notification hooks`);
          } else if (result.status === "uninstalled") {
            console.log(`Removed stale ${provider.name} notification hooks`);
          } else if (result.status === "error") {
            console.error(
              `Failed to reconcile ${provider.name} notification hooks:`,
              result.message,
            );
          }
        })
        .catch((err) => {
          console.error(
            `Failed to reconcile ${provider.name} notification hooks:`,
            err,
          );
        });
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
            // visibility:hidden (not display:none) keeps inactive workspaces
            // laid out so their terminals can size themselves before first show
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
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
}
