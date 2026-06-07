import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import type { SxProps, Theme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import {
  isShowingLastKnown,
  type ProviderUsage,
  type UsageMeter,
} from "../../../shared/types";
import { useUsage } from "../../store";
import { SIDEBAR_MIN_WIDTH_PX } from "../Layout/layout-constants";

const ROOT_SX = {
  flexShrink: 0,
  // extra hover reach above the bar, offset so the layout doesn't shift
  pt: 0.5,
  mt: -0.5,
} as const;

const PANEL_SX = {
  display: "flex",
  flexDirection: "column",
  gap: 1,
  minWidth: 180,
} as const;

const ROW_SX = {
  display: "flex",
  flexDirection: "column",
  gap: 0.25,
  py: 0.25,
} as const;

const ROW_HEAD_SX = {
  display: "flex",
  justifyContent: "space-between",
  gap: 2,
} as const;

function clampPct(util: number): number {
  if (util < 0) return 0;
  if (util > 100) return 100;
  return util;
}

function barColor(util: number): string {
  if (util >= 90) return "error.main";
  if (util >= 70) return "warning.main";
  return "primary.main";
}

function UsageProgress({ util, sx }: { util: number; sx?: SxProps<Theme> }) {
  return (
    <LinearProgress
      variant="determinate"
      value={clampPct(util)}
      sx={[
        {
          bgcolor: "action.hover",
          "& .MuiLinearProgress-bar": { bgcolor: barColor(util) },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}

function formatReset(resetsAt: string | null): string {
  if (!resetsAt) return "";
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "resetting…";
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `resets in ${days}d ${hours}h`;
  if (hours > 0) return `resets in ${hours}h ${mins}m`;
  return `resets in ${mins}m`;
}

function MeterRow({ meter }: { meter: UsageMeter }) {
  const reset = formatReset(meter.resetsAt);
  return (
    <Box sx={ROW_SX}>
      <Box sx={ROW_HEAD_SX}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {meter.label}
        </Typography>
        <Typography variant="caption">
          {Math.round(meter.utilization)}%
        </Typography>
      </Box>
      <UsageProgress
        util={meter.utilization}
        sx={{ height: 4, borderRadius: 2 }}
      />
      {reset ? (
        <Typography variant="caption" sx={{ color: "text.disabled" }}>
          {reset}
        </Typography>
      ) : null}
    </Box>
  );
}

function UsagePanel({
  providers,
  showProviderNames,
}: {
  providers: ProviderUsage[];
  showProviderNames: boolean;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <Box sx={PANEL_SX}>
      {providers.map((p) => {
        const showingLastKnown = isShowingLastKnown(p.status);
        return (
          <Box key={p.provider} sx={{ opacity: showingLastKnown ? 0.6 : 1 }}>
            {showProviderNames ? (
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "text.secondary" }}
              >
                {p.provider}
              </Typography>
            ) : null}
            {showingLastKnown ? (
              <Typography
                variant="caption"
                sx={{ display: "block", color: "text.disabled" }}
              >
                (showing last known)
              </Typography>
            ) : null}
            {p.meters.map((m) => (
              <MeterRow key={m.id} meter={m} />
            ))}
          </Box>
        );
      })}
    </Box>
  );
}

export function UsageBar() {
  const usage = useUsage();
  const visible = usage.providers.filter((p) => p.meters.length > 0);
  if (visible.length === 0) return null;

  return (
    <Tooltip
      placement="top"
      title={
        <UsagePanel
          providers={visible}
          showProviderNames={visible.length > 1}
        />
      }
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: "background.paper",
            color: "text.primary",
            border: "1px solid",
            borderColor: "custom.subtleDivider",
            boxShadow: 3,
            p: 1.25,
            maxWidth: SIDEBAR_MIN_WIDTH_PX,
          },
        },
      }}
    >
      <Box sx={ROOT_SX}>
        {visible.map((p) => {
          const meter = p.meters[0];
          if (!meter) return null;
          return (
            <UsageProgress
              key={p.provider}
              util={meter.utilization}
              sx={{
                height: 8,
                borderRadius: 0,
                borderTop: "1px solid",
                borderColor: "custom.subtleDivider",
                opacity: isShowingLastKnown(p.status) ? 0.6 : 1,
              }}
            />
          );
        })}
      </Box>
    </Tooltip>
  );
}
