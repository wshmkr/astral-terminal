import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import {
  ACCENT_COLOR_OPTIONS,
  type AccentColorId,
} from "../../theme/accent-colors";

const SWATCH_SIZE = 20;
const RING_GAP = 2;
const RING_THICKNESS = 2;
const FOCUS_PAD = SWATCH_SIZE + (RING_GAP + RING_THICKNESS) * 2;

interface Props {
  value: AccentColorId;
  onChange: (id: AccentColorId) => void;
}

export function AccentSwatchPicker({ value, onChange }: Props) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      role="radiogroup"
      aria-label="Accent color"
    >
      {ACCENT_COLOR_OPTIONS.map((opt) => {
        const selected = opt.id === value;
        return (
          <Tooltip key={opt.id} title={opt.label} disableInteractive>
            <ButtonBase
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              onClick={() => onChange(opt.id)}
              focusRipple
              sx={{
                width: FOCUS_PAD,
                height: FOCUS_PAD,
                borderRadius: "50%",
                position: "relative",
                "&:hover .swatch-dot": {
                  transform: "scale(1.08)",
                },
                "& .swatch-dot": {
                  width: SWATCH_SIZE,
                  height: SWATCH_SIZE,
                  borderRadius: "50%",
                  bgcolor: opt.hex,
                  transition: "transform 120ms ease",
                },
                "&::after": selected
                  ? {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: `${RING_THICKNESS}px solid ${opt.hex}`,
                      pointerEvents: "none",
                    }
                  : undefined,
              }}
            >
              <span className="swatch-dot" />
            </ButtonBase>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
