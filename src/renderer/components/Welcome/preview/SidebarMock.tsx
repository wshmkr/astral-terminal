import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { VscBell } from "react-icons/vsc";
import type { AppPalette } from "../../../theme/palettes";
import { SIDEBAR_WIDTH, TAB_BAR_HEIGHT } from "../ThemePreview.styles";

interface PreviewSurface {
  id: string;
  name: string;
  unread?: boolean;
}

export function SidebarMock({ palette }: { palette: AppPalette }) {
  return (
    <Stack
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        bgcolor: palette.bgPaper,
        borderRight: `1px solid ${palette.divider}`,
      }}
    >
      <Stack
        direction="row"
        sx={{
          height: TAB_BAR_HEIGHT,
          borderBottom: `1px solid ${palette.custom.subtleDivider}`,
          alignItems: "center",
          justifyContent: "flex-end",
          px: 0.75,
        }}
      >
        <Box
          sx={{
            position: "relative",
            color: palette.textDisabled,
            display: "inline-flex",
          }}
        >
          <VscBell size={11} />
          <Box
            sx={{
              position: "absolute",
              top: -2,
              right: -3,
              minWidth: 8,
              height: 8,
              px: "2px",
              borderRadius: "4px",
              bgcolor: palette.primary,
              color: palette.bgPaper,
              fontSize: 6,
              lineHeight: "8px",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            1
          </Box>
        </Box>
      </Stack>
      <WorkspaceItem
        palette={palette}
        label="workspace"
        surfaces={[
          { id: "projects-1", name: "~/projects" },
          { id: "projects-2", name: "~/projects", unread: true },
          { id: "home", name: "~" },
          { id: "notes", name: "~/notes" },
        ]}
        active
      />
      <WorkspaceItem
        palette={palette}
        label="scratch"
        surfaces={[{ id: "scratch-home", name: "~" }]}
      />
    </Stack>
  );
}

function WorkspaceItem({
  palette,
  label,
  surfaces,
  active,
}: {
  palette: AppPalette;
  label: string;
  surfaces: PreviewSurface[];
  active?: boolean;
}) {
  const hasUnread = surfaces.some((s) => s.unread);
  return (
    <Stack
      sx={{
        px: 1,
        py: 0.75,
        bgcolor: active ? palette.actionSelected : "transparent",
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        {hasUnread && (
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              bgcolor: palette.primary,
              flexShrink: 0,
            }}
          />
        )}
        <Typography
          sx={{ fontSize: 9, fontWeight: 500, color: palette.textPrimary }}
        >
          {label}
        </Typography>
      </Stack>
      {surfaces.map((s) => (
        <Typography
          key={s.id}
          sx={{
            fontSize: 7,
            color: s.unread ? palette.primary : palette.textDisabled,
            opacity: s.unread ? 1 : 0.7,
            lineHeight: 1.4,
          }}
        >
          {s.name}
        </Typography>
      ))}
    </Stack>
  );
}
