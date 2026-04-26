import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { VscChromeClose } from "react-icons/vsc";
import { CUSTOM_SCROLLBAR_SX } from "../../theme/scrollbar";
import { AppearanceSection } from "./AppearanceSection";
import { NotificationsSection } from "./NotificationsSection";

const HEADER_HEIGHT = 40;

type SectionId = "appearance" | "notifications";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
];

const PAPER_SX = {
  width: 760,
  maxWidth: "calc(100vw - 48px)",
  height: 520,
  maxHeight: "calc(100vh - 80px)",
  bgcolor: "background.paper",
  backgroundImage: "none",
  borderRadius: 1,
  overflow: "hidden",
  userSelect: "none",
  "& input, & textarea": { userSelect: "auto" },
} as const;

const HEADER_SX = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  height: HEADER_HEIGHT,
  bgcolor: "custom.titlebarFocused",
  borderBottom: 1,
  borderColor: "divider",
  userSelect: "none",
} as const;

const HEADER_TITLE_SX = {
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  fontSize: "11pt",
  fontWeight: 600,
  color: "text.secondary",
  pointerEvents: "none",
} as const;

const CloseButton = styled(IconButton)(({ theme }) => {
  const vars = theme.vars ?? theme;
  return {
    borderRadius: 0,
    width: 46,
    height: HEADER_HEIGHT,
    color: vars.palette.text.secondary,
    "&:hover": {
      backgroundColor: vars.palette.error.main,
      color: vars.palette.common.white,
    },
  };
});

const BODY_SX = {
  display: "flex",
  flex: 1,
  minHeight: 0,
} as const;

const NAV_SX = {
  width: 180,
  flexShrink: 0,
  borderRight: "1px solid",
  borderColor: "custom.subtleDivider",
} as const;

const NAV_ITEM_SX = {
  py: 1,
  px: 2.5,
  borderRadius: 0,
  "&.Mui-selected": {
    bgcolor: "action.selected",
    "& .MuiListItemText-primary": { fontWeight: 600 },
    "&:hover": { bgcolor: "action.selected" },
  },
} as const;

const CONTENT_SX = {
  flex: 1,
  p: 2,
  overflowY: "auto",
  ...CUSTOM_SCROLLBAR_SX,
} as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: Props) {
  const [section, setSection] = useState<SectionId>("appearance");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: PAPER_SX } }}
    >
      <Box sx={HEADER_SX}>
        <Typography variant="caption" sx={HEADER_TITLE_SX}>
          Settings
        </Typography>
        <CloseButton onClick={onClose} aria-label="Close settings">
          <VscChromeClose size={16} />
        </CloseButton>
      </Box>
      <Box sx={BODY_SX}>
        <List sx={NAV_SX} disablePadding>
          {SECTIONS.map((s) => (
            <ListItemButton
              key={s.id}
              sx={NAV_ITEM_SX}
              selected={section === s.id}
              onClick={() => setSection(s.id)}
            >
              <ListItemText
                primary={s.label}
                slotProps={{ primary: { variant: "body2" } }}
              />
            </ListItemButton>
          ))}
        </List>
        <Box sx={CONTENT_SX}>
          {section === "appearance" && <AppearanceSection />}
          {section === "notifications" && <NotificationsSection />}
        </Box>
      </Box>
    </Dialog>
  );
}
