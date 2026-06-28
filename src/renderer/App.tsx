import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { agentProviders } from "../shared/agent-hooks";
import { AppDndContext } from "./app/AppDndContext";
import { SurfaceBodyRegistryProvider } from "./app/SurfaceBodyRegistry";
import { WorkspaceSurfaceHost } from "./app/WorkspaceSurfaceHost";
import { installBrowserPopupListener } from "./components/Browser/popup-listener";
import { paneMinSize } from "./components/Layout/layout-math";
import { WorkspaceLayout } from "./components/Layout/WorkspaceLayout";
import { playNotificationSound } from "./components/Sidebar/notification-sound";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { TitleBar } from "./components/ui/TitleBar";
import { WelcomeDialog } from "./components/Welcome/WelcomeDialog";
import { commandShortcut } from "./keybindings/shortcutHint";
import { useKeybindings } from "./keybindings/useKeybindings";
import {
  formatNotificationDisplay,
  getState,
  isUserActivelyViewing,
  navigateToSurface,
  onNotificationAdded,
  setAgentHook,
  setAgentHookStatuses,
  setUpdateStatus,
  setUsage,
  setWindowFocused,
  useWorkspaceStore,
} from "./store";
import { resolveColorScheme } from "./theme";

function refreshAgentHookStatuses() {
  window.app
    .getAgentHookStatuses()
    .then((statuses) => {
      setAgentHookStatuses(statuses);
      for (const provider of agentProviders) {
        if (statuses[provider.name] === "stale") {
          setAgentHook(provider.name, true).catch((err) => {
            console.error(
              `Failed to upgrade ${provider.name} notification hooks:`,
              err,
            );
          });
        }
      }
    })
    .catch((err) => {
      console.error("Failed to read agent hook statuses:", err);
    });
}

export function App() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const appThemeId = useWorkspaceStore((s) => s.appearance.appThemeId);
  const welcomeOpen = useWorkspaceStore((s) => s.welcomeOpen);
  const activeLayout = workspaces.find(
    (w) => w.id === activeWorkspaceId,
  )?.layout;
  const workspacesContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useKeybindings(window.app.platform.isMac);

  const uiScale = useWorkspaceStore((s) => s.appearance.uiScale);
  const { setMode } = useColorScheme();

  useEffect(() => {
    setMode(resolveColorScheme(appThemeId));
  }, [appThemeId, setMode]);

  useEffect(() => {
    window.app.setUiZoom(uiScale);
  }, [uiScale]);

  // Keep the OS window from shrinking below what the active layout needs, so
  // panes can't be forced under their minimum by resizing the whole window.
  useEffect(() => {
    if (!containerSize) return;
    // No workspace open: drop back to the chrome-only floor (the main process
    // clamps up to MIN_WINDOW_WIDTH/HEIGHT) so a stale larger minimum doesn't
    // stick after the last workspace closes.
    const min = activeLayout
      ? paneMinSize(activeLayout)
      : { width: 0, height: 0 };
    // chrome (sidebar, title bar, borders) = window minus the pane area, CSS px
    const chromeWidth = Math.max(0, window.innerWidth - containerSize.width);
    const chromeHeight = Math.max(0, window.innerHeight - containerSize.height);
    // webFrame zoom scales every CSS px, so convert to device-independent px
    const scale = uiScale || 1;
    window.app.setMinimumWindowSize(
      Math.ceil((chromeWidth + min.width) * scale),
      Math.ceil((chromeHeight + min.height) * scale),
    );
  }, [activeLayout, containerSize, uiScale]);

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
    return window.app.onWindowFocusChange(setWindowFocused);
  }, []);

  useEffect(() => {
    return window.app.onNotificationClick(
      ({ workspaceId, paneId, surfaceId }) => {
        navigateToSurface(workspaceId, paneId, surfaceId);
      },
    );
  }, []);

  useEffect(() => {
    return installBrowserPopupListener();
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
    if (welcomeOpen) return;
    const handle = requestIdleCallback(() => refreshAgentHookStatuses());
    return () => cancelIdleCallback(handle);
  }, [welcomeOpen]);

  useEffect(() => {
    const unsubscribe = window.app.onUpdateStatus(setUpdateStatus);
    window.app
      .readUpdateStatus()
      .then(setUpdateStatus)
      .catch((err) => {
        console.error("Failed to read update status:", err);
      });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = window.app.onUsage(setUsage);
    window.app
      .readUsage()
      .then(setUsage)
      .catch((err) => {
        console.error("Failed to read usage:", err);
      });
    return unsubscribe;
  }, []);

  return (
    <AppDndContext>
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
                  {commandShortcut("workspace.new")
                    ? `press ${commandShortcut("workspace.new")} to create one`
                    : "create one from the sidebar"}
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
                    <SurfaceBodyRegistryProvider>
                      {containerSize && (
                        <WorkspaceLayout
                          layout={ws.layout}
                          containerSize={containerSize}
                        />
                      )}
                      <WorkspaceSurfaceHost
                        workspace={ws}
                        isActive={isActive}
                      />
                    </SurfaceBodyRegistryProvider>
                  </Box>
                );
              })
            )}
          </Box>
          {welcomeOpen && <WelcomeDialog />}
        </Box>
      </Box>
    </AppDndContext>
  );
}
