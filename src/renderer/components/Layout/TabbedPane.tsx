import { type DragOverEvent, useDndMonitor, useDroppable } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Tooltip from "@mui/material/Tooltip";
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  VscAdd,
  VscChromeClose,
  VscGlobe,
  VscSplitHorizontal,
  VscSplitVertical,
  VscTerminal,
} from "react-icons/vsc";
import type {
  AppState,
  LeafPane,
  Notification,
  Surface,
} from "../../../shared/types";
import { getDragData, getDragPaneId } from "../../app/dnd-types";
import { useSurfaceBodyRegister } from "../../app/SurfaceBodyRegistry";
import { commandTooltip } from "../../keybindings/shortcutHint";
import {
  addSurface,
  closePane,
  closeSurface,
  setActiveSurface,
  setFocusedPane,
  splitPane,
  unreadSurfaceIds,
  useWorkspaceStore,
} from "../../store";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import { CloseButton } from "../ui/CloseButton";
import { PaneSplitZones } from "./PaneSplitZones";
import {
  ADD_TAB_BUTTON_SX,
  ATTENTION_OUTLINE_SX,
  DROP_TARGET_OVERLAY_SX,
  ROOT_SX,
  SPLIT_BUTTON_SX,
  SURFACE_BODY_SX,
  TAB_ACTIONS_SX,
  TAB_BAR_SX,
  TAB_END_DROPZONE_SX,
  TAB_SCROLLER_SX,
} from "./TabbedPane.styles";
import { TabContent, tabItemSx } from "./TabVisual";

interface Props {
  workspaceId: string;
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: surface.id,
    data: { type: "tab", paneId },
  });
  // Memoized: during a sortable drag every sibling tab re-renders per pointer
  // frame, and a fresh sx object would make emotion re-serialize each time.
  const sx = useMemo(
    () => tabItemSx({ isActive, showDivider, activeBg, activeFg }),
    [isActive, showDivider, activeBg, activeFg],
  );
  return (
    <Box
      ref={setNodeRef}
      className="tab-item"
      onClick={() => setActiveSurface(paneId, surface.id)}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
      {...attributes}
      {...listeners}
      sx={sx}
    >
      <TabContent
        surface={surface}
        isActive={isActive}
        hasUnread={hasUnread}
        onClose={(e) => {
          e.stopPropagation();
          closeSurface(paneId, surface.id);
        }}
      />
    </Box>
  );
}

const TAB_END_DROPZONE_DRAGGING_SX = [
  TAB_END_DROPZONE_SX,
  { "& *": { pointerEvents: "none" } },
] as const;

function TabEndDropZone({
  paneId,
  lastSurfaceId,
  children,
}: {
  paneId: string;
  lastSurfaceId: string;
  children: ReactNode;
}) {
  const { setNodeRef, active } = useDroppable({
    id: `tab-end:${paneId}`,
    data: { type: "tab-end", paneId, lastSurfaceId },
  });
  return (
    <Box
      ref={setNodeRef}
      sx={active !== null ? TAB_END_DROPZONE_DRAGGING_SX : TAB_END_DROPZONE_SX}
    >
      {children}
    </Box>
  );
}

function TabBarActions({ paneId }: { paneId: string }) {
  return (
    <Box sx={TAB_ACTIONS_SX}>
      <Tooltip title={commandTooltip("Split Right", "pane.splitRight")}>
        <IconButton
          size="small"
          onClick={() => splitPane(paneId, "vertical")}
          sx={SPLIT_BUTTON_SX}
        >
          <VscSplitHorizontal size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title={commandTooltip("Split Down", "pane.splitDown")}>
        <IconButton
          size="small"
          onClick={() => splitPane(paneId, "horizontal")}
          sx={SPLIT_BUTTON_SX}
        >
          <VscSplitVertical size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title={commandTooltip("Close Pane", "pane.close")}>
        <CloseButton
          size="small"
          aria-label="Close pane"
          onClick={() => closePane(paneId)}
        >
          <VscChromeClose size={16} />
        </CloseButton>
      </Tooltip>
    </Box>
  );
}

function NewTabButton({ paneId }: { paneId: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={commandTooltip("New Tab", "tab.new")}>
        <IconButton
          size="small"
          onClick={() => addSurface(paneId, "terminal")}
          onContextMenu={(e) => {
            e.preventDefault();
            setAnchor(e.currentTarget);
          }}
          sx={ADD_TAB_BUTTON_SX}
        >
          <VscAdd size={14} />
        </IconButton>
      </Tooltip>
      <Menu
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        slotProps={{
          list: {
            sx: { p: 0.5, display: "flex", flexDirection: "row", gap: 0.5 },
          },
        }}
      >
        <Tooltip title={commandTooltip("Terminal", "tab.new")} placement="top">
          <IconButton
            size="small"
            onClick={() => {
              addSurface(paneId, "terminal");
              setAnchor(null);
            }}
          >
            <VscTerminal size={18} />
          </IconButton>
        </Tooltip>
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: "custom.subtleDivider" }}
        />
        <Tooltip
          title={commandTooltip("Browser", "tab.newBrowser")}
          placement="top"
        >
          <IconButton
            size="small"
            onClick={() => {
              addSurface(paneId, "browser");
              setAnchor(null);
            }}
          >
            <VscGlobe size={18} />
          </IconButton>
        </Tooltip>
      </Menu>
    </>
  );
}

function TabbedPaneImpl({ workspaceId, pane }: Props) {
  const terminalTheme = useWorkspaceStore(
    (s) => TERMINAL_THEMES[s.appearance.terminalThemeId],
  );
  // Scope to the pane's own workspace: selecting the active workspace's
  // notifications would re-render every mounted pane on each notification
  // and compare unread ids against the wrong workspace.
  const selectNotifications = useCallback(
    (s: AppState): Notification[] | null =>
      s.workspaces.find((w) => w.id === workspaceId)?.notifications ?? null,
    [workspaceId],
  );
  const notifications = useWorkspaceStore(selectNotifications);
  const unreadIds = useMemo(
    () => unreadSurfaceIds(notifications),
    [notifications],
  );
  const showAttentionOutline = pane.surfaces.some((s) => unreadIds.has(s.id));
  const sortableItems = useMemo(
    () => pane.surfaces.map((s) => s.id),
    [pane.surfaces],
  );
  const lastSurfaceId = pane.surfaces[pane.surfaces.length - 1]?.id;

  const [isForeignTabOver, setIsForeignTabOver] = useState(false);
  const dndListeners = useMemo(
    () => ({
      onDragOver(event: DragOverEvent) {
        const activeData = getDragData(event.active);
        const overPaneId = getDragPaneId(getDragData(event.over));
        setIsForeignTabOver(
          activeData?.type === "tab" &&
            activeData.paneId !== pane.id &&
            overPaneId === pane.id,
        );
      },
      onDragEnd: () => setIsForeignTabOver(false),
      onDragCancel: () => setIsForeignTabOver(false),
    }),
    [pane.id],
  );
  useDndMonitor(dndListeners);

  const registerSurfaceBody = useSurfaceBodyRegister();
  const surfaceBodyRef = useCallback(
    (el: HTMLDivElement | null) => {
      registerSurfaceBody(pane.id, el);
    },
    [registerSurfaceBody, pane.id],
  );

  // Native listener: portaled terminal clicks bypass React synthetic events
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onDown = () => setFocusedPane(pane.id);
    el.addEventListener("mousedown", onDown, { capture: true });
    return () => el.removeEventListener("mousedown", onDown, { capture: true });
  }, [pane.id]);

  // Native non-passive listener: React registers root wheel handlers as
  // passive, so preventDefault from a React onWheel would be a no-op.
  const tabScrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tabScrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <Box
      ref={wrapperRef}
      sx={[
        ROOT_SX,
        showAttentionOutline && ATTENTION_OUTLINE_SX,
        isForeignTabOver && DROP_TARGET_OVERLAY_SX,
      ]}
    >
      <Box sx={TAB_BAR_SX}>
        <Box ref={tabScrollerRef} sx={TAB_SCROLLER_SX}>
          <SortableContext
            items={sortableItems}
            strategy={horizontalListSortingStrategy}
          >
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
                  hasUnread={unreadIds.has(surface.id)}
                  showDivider={!isActive && !nextIsActive}
                  activeBg={terminalTheme.background}
                  activeFg={terminalTheme.foreground}
                />
              );
            })}
          </SortableContext>
          <NewTabButton paneId={pane.id} />
        </Box>
        {lastSurfaceId && (
          <TabEndDropZone paneId={pane.id} lastSurfaceId={lastSurfaceId}>
            <TabBarActions paneId={pane.id} />
          </TabEndDropZone>
        )}
      </Box>

      <Box ref={surfaceBodyRef} sx={SURFACE_BODY_SX}>
        <PaneSplitZones paneId={pane.id} />
      </Box>
    </Box>
  );
}

export const TabbedPane = memo(
  TabbedPaneImpl,
  (prev, next) =>
    prev.pane === next.pane && prev.workspaceId === next.workspaceId,
);
