import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
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

export const SWITCH_SX = { ml: -1 } as const;

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
  descriptionTone?: "default" | "error";
}

export function SettingRow({
  control,
  icon,
  title,
  description,
  descriptionTone = "default",
}: SettingRowProps) {
  const descSx =
    descriptionTone === "error" ? { ...DESC_SX, color: "error.main" } : DESC_SX;
  return (
    <Box sx={ROW_SX}>
      {control}
      {icon && <Box sx={ICON_SX}>{icon}</Box>}
      <Stack sx={TEXT_STACK_SX} spacing={0.25}>
        <Typography variant="body2" sx={TITLE_SX}>
          {title}
        </Typography>
        {description && <Typography sx={descSx}>{description}</Typography>}
      </Stack>
    </Box>
  );
}

export const FIELD_SX = {
  display: "flex",
  flexDirection: "column",
  gap: 0.75,
} as const;

export const FIELD_LABEL_SX = {
  color: "text.secondary",
  fontSize: 12,
  fontWeight: 500,
} as const;

const FIELD_LABEL_ERROR_SX = {
  ...FIELD_LABEL_SX,
  color: "error.main",
} as const;

const SELECT_SX = {
  "& .MuiSelect-select": { py: 0.5 },
} as const;

const GROUP_START_SX = { mt: 0.75 } as const;

export interface LabeledSelectOption<T extends string | number> {
  value: T;
  label: ReactNode;
  groupStart?: boolean;
}

interface LabeledSelectProps<T extends string | number> {
  label: string;
  value: T;
  options: ReadonlyArray<LabeledSelectOption<T>>;
  onChange: (value: T) => void;
  maxWidth?: number;
  error?: boolean;
}

export function LabeledSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
  maxWidth,
  error,
}: LabeledSelectProps<T>) {
  return (
    <Box sx={FIELD_SX}>
      <Typography sx={error ? FIELD_LABEL_ERROR_SX : FIELD_LABEL_SX}>
        {label}
      </Typography>
      <Select
        size="small"
        value={value}
        error={error}
        onChange={(e) => onChange(e.target.value as T)}
        sx={maxWidth ? { ...SELECT_SX, maxWidth } : SELECT_SX}
      >
        {options.map((opt) => (
          <MenuItem
            key={String(opt.value)}
            value={opt.value}
            sx={opt.groupStart ? GROUP_START_SX : undefined}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
