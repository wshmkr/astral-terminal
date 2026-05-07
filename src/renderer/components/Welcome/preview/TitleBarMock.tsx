import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { APP_NAME_SHORT } from "../../../../shared/meta";
import type { AppPalette } from "../../../theme/palettes";
import { TITLEBAR_HEIGHT } from "../ThemePreview";

export function TitleBarMock({ palette }: { palette: AppPalette }) {
  return (
    <Stack
      direction="row"
      sx={{
        height: TITLEBAR_HEIGHT,
        bgcolor: palette.custom.titlebarFocused,
        borderBottom: `1px solid ${palette.divider}`,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontSize: 10, color: palette.textSecondary }}
      >
        <Box component="span" sx={{ fontWeight: 600 }}>
          workspace
        </Box>
        {` · ${APP_NAME_SHORT.toLowerCase()}`}
      </Typography>
    </Stack>
  );
}
