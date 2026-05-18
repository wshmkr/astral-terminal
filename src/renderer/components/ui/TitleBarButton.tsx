import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";

export const TITLE_BAR_HEIGHT = 40;

export const TitleBarButton = styled(IconButton, {
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
