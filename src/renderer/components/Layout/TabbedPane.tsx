import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { memo, useMemo } from "react";
import {
  VscAdd,
  VscChromeClose,
  VscClose,
  VscSplitHorizontal,
  VscSplitVertical,
} from "react-icons/vsc";
import type {
  AppState,
  LeafPane,
  Notification,
  Surface,
} from "../../../shared/types";
import {
  addSurface,
  closePane,
  closeSurface,
  setActiveSurface,
  setFocusedPane,
  splitPane,
  useWorkspaceStore,
} from "../../store";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import { TerminalPane } from "../Terminal/TerminalPane";
import { CloseButton } from "../ui/CloseButton";
import {
  ADD_TAB_BUTTON_SX,
  ROOT_SX,
  SPLIT_BUTTON_SX,
  SURFACE_BODY_SX,
  SURFACE_SLOT_ACTIVE_SX,
  SURFACE_SLOT_HIDDEN_SX,
  TAB_ACTIONS_SX,
  TAB_BAR_SX,
  TAB_CLOSE_SX,
  TAB_SCROLLER_SX,
  TAB_TITLE_SX,
  TAB_UNREAD_DOT_SX,
} from "./TabbedPane.styles";

interface Props {
  pane: LeafPane;
}

interface TabItemProps {
  paneId: string;
  surface: Surface;
  isActive: boolean;
  hasUnread: boolean;
  showDivider: boolean;
  activeBg: string;
  activeFg: string;
}

function TabItem({
  paneId,
  surface,
  isActive,
  hasUnread,
  showDivider,
  activeBg,
  activeFg,
}: TabItemProps) {
  return (
    <Box
      className="tab-item"
      onClick={() => setActiveSurface(paneId, surface.id)}
      sx={{
        display: "flex",
        alignItems: "center",
        minWidth: 80,
        maxWidth: 200,
        gap: 0.75,
        px: 1.25,
        py: 0.75,
        cursor: "pointer",
        borderRadius: "8px 8px 0 0",
        position: "relative",
        "&::after": showDivider
          ? {
              content: '""',
              position: "absolute",
              right: 0,
              top: "25%",
              height: "50%",
              width: "1px",
              backgroundColor: "custom.subtleDivider",
              transition: "opacity 0.15s",
            }
          : {},
        bgcolor: isActive ? activeBg : "transparent",
        color: isActive ? activeFg : "text.secondary",
        userSelect: "none",
        "&:hover": { bgcolor: isActive ? activeBg : "action.hover" },
        "&:hover .tab-close": { opacity: 1 },
        "&:hover::after": { opacity: 0 },
        "&:has(+ .tab-item:hover)::after": { opacity: 0 },
      }}
    >
      {hasUnread && <Box sx={TAB_UNREAD_DOT_SX} />}
      <Typography variant="body2" noWrap sx={TAB_TITLE_SX}>
        {surface.name}
      </Typography>
      <Box
        component="span"
        className="tab-close"
        onClick={(e) => {
          e.stopPropagation();
          closeSurface(paneId, surface.id);
        }}
        sx={[TAB_CLOSE_SX, { opacity: isActive ? 1 : 0 }]}
      >
        <VscClose size={16} />
      </Box>
    </Box>
  );
}

function TabBarActions({ paneId }: { paneId: string }) {
  return (
    <Box sx={TAB_ACTIONS_SX}>
      <Tooltip title="Split Right">
        <IconButton
          size="small"
          onClick={() => splitPane(paneId, "vertical")}
          sx={SPLIT_BUTTON_SX}
        >
          <VscSplitHorizontal size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Split Down">
        <IconButton
          size="small"
          onClick={() => splitPane(paneId, "horizontal")}
          sx={SPLIT_BUTTON_SX}
        >
          <VscSplitVertical size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Close Pane">
        <CloseButton size="small" onClick={() => closePane(paneId)}>
          <VscChromeClose size={16} />
        </CloseButton>
      </Tooltip>
    </Box>
  );
}

function onTabScrollerWheel(e: React.WheelEvent<HTMLDivElement>) {
  if (e.deltaY !== 0) {
    e.currentTarget.scrollLeft += e.deltaY;
    e.preventDefault();
  }
}

function selectActiveNotifications(s: AppState): Notification[] | null {
  const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
  return ws?.notifications ?? null;
}

function TabbedPaneImpl({ pane }: Props) {
  const terminalTheme = useWorkspaceStore(
    (s) => TERMINAL_THEMES[s.appearance.terminalThemeId],
  );
  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);
  const notifications = useWorkspaceStore(selectActiveNotifications);
  const unreadSurfaceIds = useMemo(() => {
    const set = new Set<string>();
    notifications?.forEach((n) => {
      if (!n.read) set.add(n.surfaceId);
    });
    return set;
  }, [notifications]);
  const showAttentionOutline =
    unreadSurfaceIds.size > 0 && focusedPaneId !== pane.id;

  return (
    <Box
      onMouseDownCapture={() => setFocusedPane(pane.id)}
      sx={[
        ROOT_SX,
        showAttentionOutline && {
          boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}`,
        },
      ]}
    >
      <Box sx={TAB_BAR_SX}>
        <Box onWheel={onTabScrollerWheel} sx={TAB_SCROLLER_SX}>
          {pane.surfaces.map((surface, idx) => {
            const isActive = surface.id === pane.activeSurfaceId;
            const nextIsActive =
              pane.surfaces[idx + 1]?.id === pane.activeSurfaceId;
            return (
              <TabItem
                key={surface.id}
                paneId={pane.id}
                surface={surface}
                isActive={isActive}
                hasUnread={unreadSurfaceIds.has(surface.id)}
                showDivider={!isActive && !nextIsActive}
                activeBg={terminalTheme.background}
                activeFg={terminalTheme.foreground}
              />
            );
          })}
          <Tooltip title="New Tab">
            <IconButton
              size="small"
              onClick={() => addSurface(pane.id)}
              sx={ADD_TAB_BUTTON_SX}
            >
              <VscAdd size={14} />
            </IconButton>
          </Tooltip>
        </Box>

        <TabBarActions paneId={pane.id} />
      </Box>

      <Box sx={SURFACE_BODY_SX}>
        {pane.surfaces.map((surface) => {
          const isActive = surface.id === pane.activeSurfaceId;
          return (
            <Box
              key={surface.id}
              sx={isActive ? SURFACE_SLOT_ACTIVE_SX : SURFACE_SLOT_HIDDEN_SX}
            >
              {surface.type === "terminal" && (
                <TerminalPane
                  paneId={pane.id}
                  surface={surface}
                  isVisible={isActive}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export const TabbedPane = memo(
  TabbedPaneImpl,
  (prev, next) => prev.pane === next.pane,
);
