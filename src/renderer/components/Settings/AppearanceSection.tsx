import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
import {
  DIVIDER_SX,
  FIELD_LABEL_SX,
  FIELD_SX,
  LabeledSelect,
  ROOT_SX,
  SUBHEAD_SX,
} from "./shared";

const TEXTFIELD_SX = {
  "& .MuiInputBase-input": { py: 0.5 },
} as const;

const APP_THEME_OPTS = APP_THEME_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));

const UI_SCALE_OPTS = UI_SCALE_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

const TERMINAL_THEME_OPTS = TERMINAL_THEME_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));

const FONT_OPTS = FONT_OPTIONS.map((o) => ({
  value: o.id,
  label: <span style={{ fontFamily: o.stack }}>{o.label}</span>,
}));

export function AppearanceSection() {
  const appearance = useWorkspaceStore((s) => s.appearance);

  return (
    <Box sx={ROOT_SX}>
      <Typography variant="subtitle1" sx={SUBHEAD_SX}>
        App
      </Typography>

      <LabeledSelect
        label="Theme"
        value={appearance.appThemeId}
        options={APP_THEME_OPTS}
        onChange={setAppTheme}
        maxWidth={160}
      />

      <LabeledSelect
        label="UI scale"
        value={appearance.uiScale}
        options={UI_SCALE_OPTS}
        onChange={setUiScale}
        maxWidth={160}
      />

      <Divider sx={DIVIDER_SX} />

      <Typography variant="subtitle1" sx={SUBHEAD_SX}>
        Terminal
      </Typography>

      <LabeledSelect
        label="Theme"
        value={appearance.terminalThemeId}
        options={TERMINAL_THEME_OPTS}
        onChange={setTerminalTheme}
        maxWidth={240}
      />

      <LabeledSelect
        label="Font"
        value={appearance.fontFamily}
        options={FONT_OPTS}
        onChange={setFontFamily}
        maxWidth={240}
      />

      <Box sx={FIELD_SX}>
        <Typography sx={FIELD_LABEL_SX}>Font size</Typography>
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
          sx={{ ...TEXTFIELD_SX, maxWidth: 120 }}
        />
      </Box>
    </Box>
  );
}
