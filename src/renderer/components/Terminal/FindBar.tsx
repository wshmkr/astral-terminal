import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  VscArrowDown,
  VscArrowUp,
  VscCaseSensitive,
  VscClose,
} from "react-icons/vsc";
import { CloseButton } from "../ui/CloseButton";
import type { FindMatches, TerminalController } from "./terminal-lifecycle";

const ICON_SIZE = 16;

interface Props {
  controller: TerminalController;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
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
  px: 0.25,
  minWidth: 0,
  flex: "1 1 220px",
  color: "text.primary",
  "& input": { minWidth: 0 },
} as const;

const BUTTON_BASE_SX = { p: 0.25, flexShrink: 0 } as const;
const BUTTON_SX = { ...BUTTON_BASE_SX, color: "text.secondary" } as const;
const BUTTON_ACTIVE_SX = { ...BUTTON_BASE_SX, color: "primary.main" } as const;

const preventFocusSteal = (e: React.MouseEvent) => e.preventDefault();

const COUNT_SX = {
  fontSize: "12px",
  color: "text.disabled",
  width: 64,
  flexShrink: 0,
  mr: -0.5,
  userSelect: "none",
  whiteSpace: "nowrap",
  textAlign: "left" as const,
  fontVariantNumeric: "tabular-nums",
  "@container (max-width: 460px)": { display: "none" },
};

function getCountLabel(
  query: string,
  matches: FindMatches | undefined,
): string {
  if (!query) return "";
  if (!matches || matches.resultCount === 0) return "No results";
  return `${matches.resultIndex + 1} / ${matches.resultCount}`;
}

export function FindBar({ controller, onClose, inputRef }: Props) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState<FindMatches | undefined>(undefined);

  useEffect(() => {
    return controller.onFindResults(setMatches);
  }, [controller]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [inputRef]);

  useLayoutEffect(() => {
    if (!query) {
      controller.clearFind();
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

  const countLabel = getCountLabel(query, matches);

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
          onMouseDown={preventFocusSteal}
          sx={caseSensitive ? BUTTON_ACTIVE_SX : BUTTON_SX}
        >
          <VscCaseSensitive size={ICON_SIZE} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Previous (Shift+Enter)">
        <IconButton
          size="small"
          onClick={findPrev}
          onMouseDown={preventFocusSteal}
          sx={BUTTON_SX}
        >
          <VscArrowUp size={ICON_SIZE} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Next (Enter)">
        <IconButton
          size="small"
          onClick={findNext}
          onMouseDown={preventFocusSteal}
          sx={BUTTON_SX}
        >
          <VscArrowDown size={ICON_SIZE} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Close (Esc)">
        <CloseButton
          size="small"
          onClick={onClose}
          onMouseDown={preventFocusSteal}
          sx={BUTTON_BASE_SX}
        >
          <VscClose size={ICON_SIZE} />
        </CloseButton>
      </Tooltip>
    </Box>
  );
}
