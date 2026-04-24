import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { memo, useEffect, useState } from "react";
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscChromeRestore,
} from "react-icons/vsc";
import iconUrl from "../../../../build/icon.svg?url";
import iconDevUrl from "../../../../build/icon-dev.svg?url";
import { APP_NAME_SHORT } from "../../../shared/meta";
import { useWorkspaceStore } from "../../store";

const TITLE_BAR_HEIGHT = 40;
const IS_DEV = window.app.mode === "dev";
const APP_NAME_LC = IS_DEV
  ? `${APP_NAME_SHORT.toLowerCase()} (dev)`
  : APP_NAME_SHORT.toLowerCase();
const APP_ICON_URL = IS_DEV ? iconDevUrl : iconUrl;

const TitleBarButton = styled(IconButton, {
  shouldForwardProp: (p) => p !== "$dimmed" && p !== "$isClose",
})<{ $dimmed: boolean; $isClose?: boolean }>(({ theme, $dimmed, $isClose }) => {
  const vars = theme.vars ?? theme;
  return {
    borderRadius: 0,
    width: 46,
    height: TITLE_BAR_HEIGHT,
    color: $dimmed ? vars.palette.text.disabled : vars.palette.text.secondary,
    "&:hover": $isClose
      ? {
          backgroundColor: vars.palette.error.main,
          color: vars.palette.common.white,
        }
      : { backgroundColor: vars.palette.custom.titlebarButtonHover },
  };
});

const TITLE_SX = {
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  fontSize: "11pt",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  px: "140px",
} as const;

const CONTROLS_SX = { display: "flex", WebkitAppRegion: "no-drag" } as const;

const APP_ICON_SX = {
  width: 20,
  height: 20,
  mx: 1.5,
  flexShrink: 0,
} as const;

const WORKSPACE_NAME_SX = { fontWeight: 600 } as const;

function TitleBarImpl() {
  const workspaceName = useWorkspaceStore(
    (s) => s.workspaces.find((ws) => ws.id === s.activeWorkspaceId)?.name,
  );
  const dimmed = useWorkspaceStore((s) => !s.windowFocused);
  const [isMaximized, setIsMaximized] = useState(false);
  const fullTitle = workspaceName
    ? `${workspaceName} · ${APP_NAME_LC}`
    : APP_NAME_LC;

  useEffect(() => {
    const unsub = window.app.onWindowMaximizedChange(setIsMaximized);
    return unsub;
  }, []);

  return (
    <Box
      sx={{
        height: TITLE_BAR_HEIGHT,
        minHeight: TITLE_BAR_HEIGHT,
        display: "flex",
        alignItems: "center",
        bgcolor: dimmed ? "background.paper" : "custom.titlebarFocused",
        borderBottom: 1,
        borderColor: "divider",
        WebkitAppRegion: "drag",
        userSelect: "none",
      }}
    >
      <Box component="img" src={APP_ICON_URL} alt="" sx={APP_ICON_SX} />

      <Typography
        variant="caption"
        title={fullTitle}
        sx={[TITLE_SX, { color: dimmed ? "text.disabled" : "text.secondary" }]}
      >
        {workspaceName && (
          <Box component="span" sx={WORKSPACE_NAME_SX}>
            {workspaceName}
          </Box>
        )}
        {workspaceName ? ` · ${APP_NAME_LC}` : APP_NAME_LC}
      </Typography>

      <Box sx={{ flex: 1 }} />

      <Box sx={CONTROLS_SX}>
        <TitleBarButton
          $dimmed={dimmed}
          onClick={() => window.app.windowMinimize()}
        >
          <VscChromeMinimize size={16} />
        </TitleBarButton>
        <TitleBarButton
          $dimmed={dimmed}
          onClick={() => window.app.windowMaximize()}
        >
          {isMaximized ? (
            <VscChromeRestore size={16} />
          ) : (
            <VscChromeMaximize size={16} />
          )}
        </TitleBarButton>
        <TitleBarButton
          $dimmed={dimmed}
          $isClose
          onClick={() => window.app.windowClose()}
        >
          <VscChromeClose size={16} />
        </TitleBarButton>
      </Box>
    </Box>
  );
}

export const TitleBar = memo(TitleBarImpl);
