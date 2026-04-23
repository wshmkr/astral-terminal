import InputBase from "@mui/material/InputBase";
import { useState } from "react";

const INPUT_SX = {
  flex: 1,
  minWidth: 0,
  p: 0,
  fontSize: "0.875rem",
  fontWeight: 500,
  lineHeight: 1.43,
  color: "text.primary",
  "& input": { overflowX: "auto", boxSizing: "content-box" },
} as const;

const INPUT_PROPS = {
  style: { padding: 0, height: "auto", lineHeight: 1.43 },
} as const;

interface Props {
  initialName: string;
  maxLength: number;
  onCommit: (next: string) => void;
  onCancel: () => void;
}

export function WorkspaceRenameInput({
  initialName,
  maxLength,
  onCommit,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState(initialName);

  const commit = () => {
    const next = draft.trim().replace(/\s+/g, " ").slice(0, maxLength);
    onCommit(next);
  };

  return (
    <InputBase
      value={draft}
      autoFocus
      onFocus={(e) => e.target.select()}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      inputProps={{ maxLength, ...INPUT_PROPS }}
      sx={INPUT_SX}
    />
  );
}
