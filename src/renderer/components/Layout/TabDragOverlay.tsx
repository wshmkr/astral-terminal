import Box from "@mui/material/Box";
import { useWorkspaceStore } from "../../store";
import { TERMINAL_THEMES } from "../../theme/terminal-themes";
import { findLeafPane } from "./pane-tree";
import { TabContent, tabItemSx } from "./TabbedPane";

const TAB_OVERLAY_SX = { boxShadow: 4, cursor: "grabbing" } as const;

interface Props {
  paneId: string;
  surfaceId: string;
}

export function TabDragOverlay({ paneId, surfaceId }: Props) {
  const leaf = useWorkspaceStore((s) => {
    const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
    return ws ? findLeafPane(ws.layout, paneId) : null;
  });
  const theme = useWorkspaceStore(
    (s) => TERMINAL_THEMES[s.appearance.terminalThemeId],
  );
  const surface = leaf?.surfaces.find((sf) => sf.id === surfaceId) ?? null;
  if (!surface) return null;
  const isActive = leaf?.activeSurfaceId === surfaceId;
  return (
    <Box
      sx={[
        tabItemSx({
          isActive,
          showDivider: false,
          activeBg: theme.background,
          activeFg: theme.foreground,
        }),
        TAB_OVERLAY_SX,
      ]}
    >
      <TabContent
        surface={surface}
        isActive={isActive}
        hasUnread={false}
        showDivider={false}
        activeBg={theme.background}
        activeFg={theme.foreground}
      />
    </Box>
  );
}
