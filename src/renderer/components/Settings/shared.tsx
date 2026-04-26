import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export const ROOT_SX = {
  display: "flex",
  flexDirection: "column",
  gap: 1.5,
  minHeight: "100%",
} as const;

export const SUBHEAD_SX = {
  fontWeight: 600,
  lineHeight: 1.25,
} as const;

export const DIVIDER_SX = { my: 1 } as const;

const ROW_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
} as const;

const TEXT_STACK_SX = { flex: 1, minWidth: 0 } as const;

const TITLE_SX = { fontWeight: 500 } as const;

const DESC_SX = {
  color: "text.secondary",
  fontSize: 12,
} as const;

const ERROR_SX = {
  color: "error.main",
  fontSize: 12,
} as const;

const ICON_SX = {
  display: "inline-flex",
  color: "text.secondary",
  mx: 0.25,
} as const;

interface SettingRowProps {
  control: ReactNode;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  error?: string;
}

export function SettingRow({
  control,
  icon,
  title,
  description,
  error,
}: SettingRowProps) {
  return (
    <Box sx={ROW_SX}>
      {control}
      {icon && <Box sx={ICON_SX}>{icon}</Box>}
      <Stack sx={TEXT_STACK_SX} spacing={0.25}>
        <Typography variant="body2" sx={TITLE_SX}>
          {title}
        </Typography>
        {description && <Typography sx={DESC_SX}>{description}</Typography>}
        {error && <Typography sx={ERROR_SX}>{error}</Typography>}
      </Stack>
    </Box>
  );
}
