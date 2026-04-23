import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  VscArrowDown,
  VscArrowUp,
  VscCaseSensitive,
  VscClose,
} from "react-icons/vsc";
import type { FindMatches, TerminalController } from "./terminal-lifecycle";

interface Props {
  controller: TerminalController;
  onClose: () => void;
}

const BAR_SX = {
  position: "absolute",
  top: 8,
  right: 16,
  maxWidth: "calc(100% - 32px)",
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  px: 1,
  py: 0.5,
  bgcolor: "background.paper",
  borderRadius: 1,
  boxShadow: 3,
  border: 1,
  borderColor: "divider",
  minWidth: 0,
} as const;

const INPUT_SX = {
  fontSize: "13px",
  px: 0.75,
  minWidth: 0,
  flex: "1 1 220px",
  color: "text.primary",
  "& input": { minWidth: 0 },
} as const;

const BUTTON_SX = { color: "text.secondary", p: 0.5, flexShrink: 0 } as const;

const BUTTON_ACTIVE_SX = {
  color: "primary.main",
  p: 0.5,
  flexShrink: 0,
} as const;

const COUNT_SX = {
  fontSize: "12px",
  color: "text.disabled",
  width: 64,
  flexShrink: 0,
  whiteSpace: "nowrap",
  textAlign: "right" as const,
  fontVariantNumeric: "tabular-nums",
  "@container (max-width: 460px)": { display: "none" },
};

export function FindBar({ controller, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState<FindMatches | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return controller.onFindResults(setMatches);
  }, [controller]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useLayoutEffect(() => {
    if (!query) {
      controller.clearFind();
      setMatches(undefined);
      return;
    }
    controller.findNext(query, caseSensitive);
  }, [query, caseSensitive, controller]);

  useEffect(() => {
    return () => controller.clearFind();
  }, [controller]);

  const findNext = () => {
    if (query) controller.findNext(query, caseSensitive);
  };
  const findPrev = () => {
    if (query) controller.findPrevious(query, caseSensitive);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) findPrev();
      else findNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const countLabel = !query
    ? ""
    : !matches || matches.resultCount === 0
      ? "No results"
      : `${matches.resultIndex + 1} / ${matches.resultCount}`;

  return (
    <Box
      sx={BAR_SX}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <InputBase
        inputRef={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Find"
        sx={INPUT_SX}
      />
      <Typography sx={COUNT_SX}>{countLabel}</Typography>
      <Tooltip title="Match case">
        <IconButton
          size="small"
          onClick={() => setCaseSensitive((v) => !v)}
          sx={caseSensitive ? BUTTON_ACTIVE_SX : BUTTON_SX}
        >
          <VscCaseSensitive size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Previous (Shift+Enter)">
        <IconButton size="small" onClick={findPrev} sx={BUTTON_SX}>
          <VscArrowUp size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Next (Enter)">
        <IconButton size="small" onClick={findNext} sx={BUTTON_SX}>
          <VscArrowDown size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Close (Esc)">
        <IconButton size="small" onClick={onClose} sx={BUTTON_SX}>
          <VscClose size={14} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
