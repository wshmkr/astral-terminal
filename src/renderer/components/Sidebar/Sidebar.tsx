import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { memo, useRef } from "react";
import { VscAdd, VscGear } from "react-icons/vsc";
import { useDrag } from "../../hooks/useDrag";
import {
  clampSidebarWidth,
  createWorkspace,
  setSettingsOpen,
  setSidebarWidth,
  useWorkspaceStore,
} from "../../store";
import { RESIZE_HANDLE_SIZE_PX } from "../Layout/layout-constants";
import { DraggableHandle } from "../ui/DraggableHandle";
import { OverlayScrollbar } from "../ui/OverlayScrollbar";
import { NotificationPanel } from "./NotificationPanel";
import { WorkspaceTab } from "./WorkspaceTab";

const ROOT_SX = {
  display: "flex",
  flexShrink: 0,
  position: "relative",
} as const;

const INNER_SX = {
  bgcolor: "background.paper",
  borderRight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  position: "relative",
  "&:hover [data-scrollbar-visible] > div": {
    backgroundColor: "custom.scrollbarThumb",
  },
  "&:hover [data-scrollbar-visible] > div:hover": {
    backgroundColor: "custom.scrollbarThumbHover",
  },
} as const;

const HEADER_SX = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  pl: 1.5,
  pr: 0.5,
  minHeight: 40,
  borderBottom: "1px solid",
  borderColor: "custom.subtleDivider",
} as const;

const HEADER_TITLE_SX = {
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "text.disabled",
  userSelect: "none",
} as const;

const HEADER_ACTIONS_SX = { display: "flex" } as const;

const SETTINGS_BUTTON_SX = { color: "text.disabled" } as const;

const LIST_CONTAINER_SX = {
  flexGrow: 0,
  flexShrink: 1,
  flexBasis: "auto",
  minHeight: 0,
  position: "relative",
  display: "flex",
  flexDirection: "column",
  "&:has([data-scrollbar-visible]) .ws-close": { right: "20px" },
} as const;

const SCROLL_SX = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;

const NEW_WORKSPACE_CONTAINER_SX = {
  flexGrow: 1,
  flexShrink: 0,
  flexBasis: "auto",
  borderTop: "1px solid",
  borderColor: "custom.subtleDivider",
} as const;

const NEW_WORKSPACE_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.75,
  p: "14px 16px",
  minHeight: 36,
  cursor: "pointer",
  userSelect: "none",
  color: "text.disabled",
  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
} as const;

const NEW_WORKSPACE_LABEL_SX = { fontWeight: 500 } as const;

function SidebarImpl() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef({ startX: 0, startWidth: 0, latestWidth: 0 });

  const onHandleMouseDown = useDrag({
    cursor: "col-resize",
    onDragStart: (e) => {
      const startWidth =
        innerRef.current?.getBoundingClientRect().width ?? sidebarWidth;
      dragRef.current = {
        startX: e.clientX,
        startWidth,
        latestWidth: startWidth,
      };
    },
    onDrag: (ev) => {
      const drag = dragRef.current;
      const newWidth = clampSidebarWidth(
        drag.startWidth + (ev.clientX - drag.startX),
        window.innerWidth,
      );
      drag.latestWidth = newWidth;
      const el = innerRef.current;
      if (el) {
        const px = `${newWidth}px`;
        el.style.width = px;
        el.style.minWidth = px;
      }
    },
    onDragEnd: () => {
      setSidebarWidth(dragRef.current.latestWidth);
    },
  });

  return (
    <Box sx={ROOT_SX}>
      <Box
        ref={innerRef}
        sx={[INNER_SX, { width: sidebarWidth, minWidth: sidebarWidth }]}
      >
        <Box sx={HEADER_SX}>
          <Typography variant="caption" sx={HEADER_TITLE_SX}>
            Workspaces
          </Typography>
          <Box sx={HEADER_ACTIONS_SX}>
            <NotificationPanel />
            <Tooltip title="Settings">
              <IconButton
                sx={SETTINGS_BUTTON_SX}
                onClick={() => setSettingsOpen(true)}
              >
                <VscGear size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={LIST_CONTAINER_SX}>
          <Box ref={scrollRef} className="workspace-scroll" sx={SCROLL_SX}>
            {workspaces.map((ws, index) => {
              const isActive = ws.id === activeWorkspaceId;
              const nextIsActive =
                workspaces[index + 1]?.id === activeWorkspaceId;
              const isLast = index === workspaces.length - 1;
              return (
                <WorkspaceTab
                  key={ws.id}
                  workspace={ws}
                  isActive={isActive}
                  showDivider={!isActive && !nextIsActive && !isLast}
                />
              );
            })}
          </Box>
          <OverlayScrollbar scrollRef={scrollRef} />
        </Box>
        <Box sx={NEW_WORKSPACE_CONTAINER_SX}>
          <Box onClick={() => createWorkspace()} sx={NEW_WORKSPACE_SX}>
            <VscAdd size={14} />
            <Typography variant="body2" sx={NEW_WORKSPACE_LABEL_SX}>
              New Workspace
            </Typography>
          </Box>
        </Box>
      </Box>
      <DraggableHandle
        orientation="vertical"
        onMouseDown={onHandleMouseDown}
        style={{
          right: -Math.floor(RESIZE_HANDLE_SIZE_PX / 2),
          top: 0,
          width: RESIZE_HANDLE_SIZE_PX,
          height: "100%",
        }}
      />
    </Box>
  );
}

export const Sidebar = memo(SidebarImpl);
