import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { VscQuestion } from "react-icons/vsc";
import { MONO_FONT_STACK } from "../../theme/fonts";

const SUBHEAD_BASE_SX = {
  fontFamily: MONO_FONT_STACK,
  fontWeight: 700,
  letterSpacing: "0.08em",
  fontSize: 13,
} as const;
const SUBHEAD_LABEL_SX = {
  ...SUBHEAD_BASE_SX,
  textTransform: "uppercase",
  color: "text.primary",
} as const;
const SUBHEAD_INDEX_SX = {
  ...SUBHEAD_BASE_SX,
  color: "primary.main",
} as const;
const HELP_ICON_SX = {
  display: "inline-flex",
  alignSelf: "center",
  color: "text.disabled",
  cursor: "help",
} as const;
const BODY_SX = { pl: 3.25 } as const;

interface Props {
  index: string;
  label: string;
  helpText?: string;
  children: ReactNode;
}

export function NumberedSection({ index, label, helpText, children }: Props) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
        <Typography sx={SUBHEAD_INDEX_SX}>{index}</Typography>
        <Typography sx={SUBHEAD_LABEL_SX}>{label}</Typography>
        {helpText && (
          <Tooltip title={helpText} placement="right" arrow>
            <Box component="span" sx={HELP_ICON_SX}>
              <VscQuestion size={16} />
            </Box>
          </Tooltip>
        )}
      </Stack>
      <Stack spacing={1.5} sx={BODY_SX}>
        {children}
      </Stack>
    </Stack>
  );
}
