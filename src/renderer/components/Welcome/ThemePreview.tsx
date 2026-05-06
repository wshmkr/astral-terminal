import Stack from "@mui/material/Stack";
import { memo } from "react";
import type { TerminalTheme } from "../../../shared/types";
import type { AppPalette } from "../../theme/palettes";
import { PaneMock } from "./preview/PaneMock";
import { SidebarMock } from "./preview/SidebarMock";
import { TitleBarMock } from "./preview/TitleBarMock";

interface Props {
  appPalette: AppPalette;
  terminalTheme: TerminalTheme;
}

export const ThemePreview = memo(function ThemePreview({
  appPalette,
  terminalTheme,
}: Props) {
  return (
    <Stack
      sx={{
        width: "100%",
        height: "100%",
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: appPalette.bgDefault,
      }}
    >
      <TitleBarMock palette={appPalette} />
      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        <SidebarMock palette={appPalette} />
        <Stack
          sx={{
            flex: 1,
            minWidth: 0,
            gap: "1px",
            bgcolor: appPalette.divider,
          }}
        >
          <PaneMock
            palette={appPalette}
            terminalTheme={terminalTheme}
            tabs={[
              { id: "projects-1", label: "~/projects", active: true },
              {
                id: "projects-2",
                label: "~/projects",
                active: false,
                unread: true,
              },
              { id: "home", label: "~", active: false },
            ]}
            sample="primary"
            flex={6}
          />
          <PaneMock
            palette={appPalette}
            terminalTheme={terminalTheme}
            tabs={[{ id: "notes", label: "~/notes", active: true }]}
            sample="secondary"
            flex={4}
          />
        </Stack>
      </Stack>
    </Stack>
  );
});
