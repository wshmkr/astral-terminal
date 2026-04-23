import IconButton, { type IconButtonProps } from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";

export const CloseButton = styled(IconButton)<IconButtonProps>(({ theme }) => ({
  color: theme.palette.text.disabled,
  "&:hover": {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.common.white,
  },
}));
