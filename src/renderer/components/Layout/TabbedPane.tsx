import { useDndMonitor, useDroppable } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { memo, type ReactNode, useCallback, useMemo, useState } from "react";
import {
  VscAdd,
  VscChromeClose,
  VscSplitHorizontal,
  VscSplitVertical,
} from "react-icons/vsc";
import type {
  AppState,
  LeafPane,
  Notification,
  Surface,
} from "../../../shared/types";
import { getDragData, getDragPaneId } from "../../app/dnd-types";
import { useSurfaceBodyRegister } from "../../app/SurfaceBodyRegistry";
import {
  addSurface,
  closePane,
  closeSurface,
  selectActiveWorkspace,
  setActiveSurface,
  setFocusedPane,
  splitPane,
  unreadSurfaceIds,
  useWorkspaceStore,
} from "../../store";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import { CloseButton } from "../ui/CloseButton";
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
      sx={tabItemSx({ isActive, showDivider, activeBg, activeFg })}
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
  return selectActiveWorkspace(s)?.notifications ?? null;
}

function TabbedPaneImpl({ pane }: Props) {
  const terminalTheme = useWorkspaceStore(
    (s) => TERMINAL_THEMES[s.appearance.terminalThemeId],
  );
  const notifications = useWorkspaceStore(selectActiveNotifications);
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
  useDndMonitor({
    onDragOver(event) {
      const activeData = getDragData(event.active);
      const overPaneId = getDragPaneId(getDragData(event.over));
      const next =
        activeData?.type === "tab" &&
        activeData.paneId !== pane.id &&
        overPaneId === pane.id;
      setIsForeignTabOver((prev) => (prev === next ? prev : next));
    },
    onDragEnd() {
      setIsForeignTabOver(false);
    },
    onDragCancel() {
      setIsForeignTabOver(false);
    },
  });

  const registerSurfaceBody = useSurfaceBodyRegister();
  const surfaceBodyRef = useCallback(
    (el: HTMLDivElement | null) => {
      registerSurfaceBody(pane.id, el);
    },
    [registerSurfaceBody, pane.id],
  );

  return (
    <Box
      onMouseDownCapture={() => setFocusedPane(pane.id)}
      sx={[
        ROOT_SX,
        showAttentionOutline && ATTENTION_OUTLINE_SX,
        isForeignTabOver && DROP_TARGET_OVERLAY_SX,
      ]}
    >
      <Box sx={TAB_BAR_SX}>
        <Box onWheel={onTabScrollerWheel} sx={TAB_SCROLLER_SX}>
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
        {lastSurfaceId && (
          <TabEndDropZone paneId={pane.id} lastSurfaceId={lastSurfaceId}>
            <TabBarActions paneId={pane.id} />
          </TabEndDropZone>
        )}
      </Box>

      <Box ref={surfaceBodyRef} sx={SURFACE_BODY_SX} />
    </Box>
  );
}

export const TabbedPane = memo(
  TabbedPaneImpl,
  (prev, next) => prev.pane === next.pane,
);
