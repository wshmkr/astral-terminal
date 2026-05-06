import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { ReactNode } from "react";
import type { TerminalTheme } from "../../../../shared/types";
import type { AppPalette } from "../../../theme/palettes";
import { TAB_BAR_HEIGHT } from "../ThemePreview.styles";
import { TerminalSample } from "./TerminalSample";

interface PaneTab {
  id: string;
  label: string;
  active: boolean;
  unread?: boolean;
}

export function PaneMock({
  palette,
  terminalTheme,
  tabs,
  sample,
  flex,
}: {
  palette: AppPalette;
  terminalTheme: TerminalTheme;
  tabs: PaneTab[];
  sample: "primary" | "secondary";
  flex: number;
}) {
  return (
    <Stack sx={{ flex, minHeight: 0 }}>
      <Stack
        direction="row"
        spacing={0.25}
        sx={{
          height: TAB_BAR_HEIGHT,
          bgcolor: palette.bgPaper,
          pt: 0.5,
          pl: 0.5,
          flexShrink: 0,
          alignItems: "flex-end",
        }}
      >
        {tabs.map((t, i) => {
          const next = tabs[i + 1];
          const showDivider = !t.active && !!next && !next.active;
          return (
            <PreviewTab
              key={t.id}
              palette={palette}
              terminalTheme={terminalTheme}
              active={t.active}
              unread={t.unread}
              showDivider={showDivider}
            >
              {t.label}
            </PreviewTab>
          );
        })}
      </Stack>
      <TerminalSample theme={terminalTheme} variant={sample} />
    </Stack>
  );
}

function PreviewTab({
  palette,
  terminalTheme,
  active,
  unread,
  showDivider,
  children,
}: {
  palette: AppPalette;
  terminalTheme: TerminalTheme;
  active?: boolean;
  unread?: boolean;
  showDivider?: boolean;
  children: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        position: "relative",
        alignItems: "center",
        px: 1,
        py: 0.5,
        minWidth: 60,
        borderRadius: "6px 6px 0 0",
        bgcolor: active ? terminalTheme.background : "transparent",
        color: active ? terminalTheme.foreground : palette.textSecondary,
        fontSize: 9,
        "&::after": showDivider
          ? {
              content: '""',
              position: "absolute",
              right: 0,
              top: "25%",
              height: "50%",
              width: "1px",
              backgroundColor: palette.custom.subtleDivider,
            }
          : undefined,
      }}
    >
      {unread && (
        <Box
          sx={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            bgcolor: palette.primary,
            flexShrink: 0,
          }}
        />
      )}
      <Box component="span">{children}</Box>
    </Stack>
  );
}
