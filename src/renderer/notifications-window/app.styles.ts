export const ROOT_SX = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  userSelect: "none",
  "& input, & textarea": { userSelect: "auto" },
} as const;
