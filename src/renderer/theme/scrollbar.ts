export const CUSTOM_SCROLLBAR_SX = {
  "&::-webkit-scrollbar": { width: 10, backgroundColor: "transparent" },
  "&::-webkit-scrollbar-thumb": { backgroundColor: "custom.scrollbarThumb" },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "custom.scrollbarThumbHover",
  },
} as const;
