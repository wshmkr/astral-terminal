import Box from "@mui/material/Box";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { styled } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import {
  ACCENT_COLOR_OPTIONS,
  type AccentColorId,
} from "../../theme/accent-colors";

const SWATCH_SIZE = 20;
const RING_GAP = 2;
const RING_THICKNESS = 2;
const OUTER_SIZE = SWATCH_SIZE + (RING_GAP + RING_THICKNESS) * 2;

interface Props {
  value: AccentColorId;
  onChange: (id: AccentColorId) => void;
}

const SwatchDot = styled("span")({
  width: SWATCH_SIZE,
  height: SWATCH_SIZE,
  borderRadius: "50%",
  transition: "transform 120ms ease",
});

function SwatchIcon({ hex, selected }: { hex: string; selected: boolean }) {
  return (
    <Box
      sx={{
        width: OUTER_SIZE,
        height: OUTER_SIZE,
        borderRadius: "50%",
        position: "relative",
        display: "grid",
        placeItems: "center",
        "&::after": selected
          ? {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `${RING_THICKNESS}px solid ${hex}`,
              pointerEvents: "none",
            }
          : undefined,
      }}
    >
      <SwatchDot className="swatch-dot" style={{ backgroundColor: hex }} />
    </Box>
  );
}

export function AccentSwatchPicker({ value, onChange }: Props) {
  return (
    <RadioGroup
      row
      value={value}
      onChange={(_, v) => onChange(v as AccentColorId)}
      aria-label="Accent color"
      sx={{ gap: 0.5, flexWrap: "nowrap" }}
    >
      {ACCENT_COLOR_OPTIONS.map((opt) => (
        <Tooltip key={opt.id} title={opt.label} disableInteractive>
          <Radio
            value={opt.id}
            disableRipple
            icon={<SwatchIcon hex={opt.hex} selected={false} />}
            checkedIcon={<SwatchIcon hex={opt.hex} selected={true} />}
            slotProps={{ input: { "aria-label": opt.label } }}
            sx={{
              p: 0,
              // class selector, not `${SwatchDot}`: component selectors need
              // @emotion/babel-plugin, which this build doesn't run
              "&:hover .swatch-dot": { transform: "scale(1.08)" },
            }}
          />
        </Tooltip>
      ))}
    </RadioGroup>
  );
}
