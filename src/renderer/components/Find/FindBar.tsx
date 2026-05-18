import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { cloneElement, useEffect, useLayoutEffect, useState } from "react";
import {
  VscArrowDown,
  VscArrowUp,
  VscCaseSensitive,
  VscClose,
} from "react-icons/vsc";
import { CloseButton } from "../ui/CloseButton";

export interface FindMatches {
  resultIndex: number;
  resultCount: number;
}

export interface FindController {
  findNext(query: string, caseSensitive: boolean): void;
  findPrevious(query: string, caseSensitive: boolean): void;
  clearFind(): void;
  onFindResults(cb: (m: FindMatches | undefined) => void): () => void;
}

const ICON_SIZE = 16;

interface Props {
  controller: FindController;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  variant?: "overlay" | "embedded";
}

const BAR_BASE_SX = {
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

const BAR_OVERLAY_SX = {
  ...BAR_BASE_SX,
  position: "absolute",
  top: 8,
  right: 16,
  maxWidth: "calc(100% - 32px)",
  zIndex: 10,
} as const;

const BAR_EMBEDDED_SX = {
  ...BAR_BASE_SX,
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  borderRadius: 0,
  boxShadow: "none",
  borderWidth: 0,
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

export function FindBar({
  controller,
  onClose,
  inputRef,
  variant = "overlay",
}: Props) {
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
      sx={variant === "embedded" ? BAR_EMBEDDED_SX : BAR_OVERLAY_SX}
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
      <Hint title="Match case" variant={variant}>
        <IconButton
          size="small"
          onClick={() => setCaseSensitive((v) => !v)}
          onMouseDown={preventFocusSteal}
          sx={caseSensitive ? BUTTON_ACTIVE_SX : BUTTON_SX}
        >
          <VscCaseSensitive size={ICON_SIZE} />
        </IconButton>
      </Hint>
      <Hint title="Previous (Shift+Enter)" variant={variant}>
        <IconButton
          size="small"
          onClick={findPrev}
          onMouseDown={preventFocusSteal}
          sx={BUTTON_SX}
        >
          <VscArrowUp size={ICON_SIZE} />
        </IconButton>
      </Hint>
      <Hint title="Next (Enter)" variant={variant}>
        <IconButton
          size="small"
          onClick={findNext}
          onMouseDown={preventFocusSteal}
          sx={BUTTON_SX}
        >
          <VscArrowDown size={ICON_SIZE} />
        </IconButton>
      </Hint>
      <Hint title="Close (Esc)" variant={variant}>
        <CloseButton
          size="small"
          onClick={onClose}
          onMouseDown={preventFocusSteal}
          sx={BUTTON_BASE_SX}
        >
          <VscClose size={ICON_SIZE} />
        </CloseButton>
      </Hint>
    </Box>
  );
}

function Hint({
  title,
  variant,
  children,
}: {
  title: string;
  variant: "overlay" | "embedded";
  children: React.ReactElement<{ title?: string }>;
}) {
  if (variant === "embedded") {
    return cloneElement(children, { title });
  }
  return <Tooltip title={title}>{children}</Tooltip>;
}
