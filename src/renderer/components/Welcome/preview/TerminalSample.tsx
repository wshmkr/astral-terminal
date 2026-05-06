import Box from "@mui/material/Box";
import type { TerminalTheme } from "../../../../shared/types";
import { MONO_FONT_STACK } from "../../../theme/fonts";

export function TerminalSample({
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
        fontFamily: MONO_FONT_STACK,
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
