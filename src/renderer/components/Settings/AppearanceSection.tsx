import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type {
  AppThemeId,
  FontFamilyId,
  TerminalThemeId,
} from "../../../shared/types";
import {
  setAppTheme,
  setFontFamily,
  setFontSize,
  setTerminalTheme,
  setUiScale,
  useWorkspaceStore,
} from "../../store";
import {
  FONT_OPTIONS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  UI_SCALE_OPTIONS,
} from "../../theme/fonts";
import { APP_THEME_OPTIONS } from "../../theme/palettes";
import { TERMINAL_THEME_OPTIONS } from "../../theme/terminal-themes";

const FIELD_SX = {
  display: "flex",
  flexDirection: "column",
  gap: 0.75,
} as const;

const LABEL_SX = {
  color: "text.secondary",
  fontSize: 12,
  fontWeight: 500,
} as const;

const ROOT_SX = {
  display: "flex",
  flexDirection: "column",
  gap: 2.5,
} as const;

export function AppearanceSection() {
  const appearance = useWorkspaceStore((s) => s.appearance);

  return (
    <Box sx={ROOT_SX}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Appearance
      </Typography>

      <Box sx={FIELD_SX}>
        <Typography sx={LABEL_SX}>App theme</Typography>
        <Select
          size="small"
          value={appearance.appThemeId}
          onChange={(e: SelectChangeEvent<AppThemeId>) =>
            setAppTheme(e.target.value as AppThemeId)
          }
        >
          {APP_THEME_OPTIONS.map((opt) => (
            <MenuItem key={opt.id} value={opt.id}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Box sx={FIELD_SX}>
        <Typography sx={LABEL_SX}>UI scale</Typography>
        <Select
          size="small"
          value={appearance.uiScale}
          onChange={(e: SelectChangeEvent<number>) =>
            setUiScale(Number(e.target.value))
          }
          sx={{ maxWidth: 160 }}
        >
          {UI_SCALE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Box sx={FIELD_SX}>
        <Typography sx={LABEL_SX}>Terminal theme</Typography>
        <Select
          size="small"
          value={appearance.terminalThemeId}
          onChange={(e: SelectChangeEvent<TerminalThemeId>) =>
            setTerminalTheme(e.target.value as TerminalThemeId)
          }
        >
          {TERMINAL_THEME_OPTIONS.map((opt) => (
            <MenuItem key={opt.id} value={opt.id}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Box sx={FIELD_SX}>
        <Typography sx={LABEL_SX}>Terminal font</Typography>
        <Select
          size="small"
          value={appearance.fontFamily}
          onChange={(e: SelectChangeEvent<FontFamilyId>) =>
            setFontFamily(e.target.value as FontFamilyId)
          }
        >
          {FONT_OPTIONS.map((opt) => (
            <MenuItem key={opt.id} value={opt.id}>
              <span style={{ fontFamily: opt.stack }}>{opt.label}</span>
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Box sx={FIELD_SX}>
        <Typography sx={LABEL_SX}>Terminal font size</Typography>
        <TextField
          size="small"
          type="number"
          value={appearance.fontSize}
          slotProps={{
            htmlInput: {
              min: MIN_FONT_SIZE,
              max: MAX_FONT_SIZE,
              step: 1,
            },
          }}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setFontSize(n);
          }}
          sx={{ maxWidth: 120 }}
        />
      </Box>
    </Box>
  );
}
