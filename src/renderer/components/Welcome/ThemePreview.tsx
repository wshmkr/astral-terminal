import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { VscBell } from "react-icons/vsc";
import { APP_NAME_SHORT } from "../../../shared/meta";
import type { TerminalTheme } from "../../../shared/types";
import type { AppPalette } from "../../theme/palettes";

const TITLEBAR_HEIGHT = 24;
const SIDEBAR_WIDTH = 80;
const TAB_BAR_HEIGHT = 30;

interface Props {
  appPalette: AppPalette;
  terminalTheme: TerminalTheme;
}

export function ThemePreview({ appPalette, terminalTheme }: Props) {
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
}

function TitleBarMock({ palette }: { palette: AppPalette }) {
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

function SidebarMock({ palette }: { palette: AppPalette }) {
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

interface PreviewSurface {
  id: string;
  name: string;
  unread?: boolean;
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

interface PaneTab {
  id: string;
  label: string;
  active: boolean;
  unread?: boolean;
}

function PaneMock({
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
  children: React.ReactNode;
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

function TerminalSample({
  theme,
  variant,
}: {
  theme: TerminalTheme;
  variant: "primary" | "secondary";
}) {
  return (
    <Box
      component="pre"
      sx={{
        flex: 1,
        minHeight: 0,
        m: 0,
        p: 1,
        bgcolor: theme.background,
        color: theme.foreground,
        fontFamily:
          '"Cascadia Code", "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
        fontSize: 10,
        lineHeight: 1.5,
        overflow: "hidden",
        whiteSpace: "pre",
      }}
    >
      {variant === "primary" ? (
        <PrimaryLines theme={theme} />
      ) : (
        <SecondaryLines theme={theme} />
      )}
    </Box>
  );
}

function PrimaryLines({ theme }: { theme: TerminalTheme }) {
  return (
    <>
      <span style={{ color: theme.green }}>user@astral</span>
      <span>:</span>
      <span style={{ color: theme.blue }}>~/projects</span>
      <span>$ ls</span>
      {"\n"}
      <span style={{ color: theme.cyan }}>astral/</span>
      {"  "}
      <span style={{ color: theme.cyan }}>notes/</span>
      {"  "}
      <span>readme.md</span>
      {"\n"}
      <span style={{ color: theme.green }}>user@astral</span>
      <span>:</span>
      <span style={{ color: theme.blue }}>~/projects</span>
      <span>$ </span>
      <Cursor theme={theme} />
    </>
  );
}

function SecondaryLines({ theme }: { theme: TerminalTheme }) {
  return (
    <>
      <span style={{ color: theme.green }}>user@astral</span>
      <span>:</span>
      <span style={{ color: theme.blue }}>~/notes</span>
      <span>$ </span>
      <span style={{ color: theme.yellow }}>echo</span>
      <span> </span>
      <span style={{ color: theme.red }}>"hello"</span>
      {"\n"}
      <span>hello</span>
    </>
  );
}

function Cursor({ theme }: { theme: TerminalTheme }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        width: "0.55em",
        height: "1em",
        bgcolor: theme.cursor,
        verticalAlign: "text-bottom",
        ml: "1px",
      }}
    />
  );
}
