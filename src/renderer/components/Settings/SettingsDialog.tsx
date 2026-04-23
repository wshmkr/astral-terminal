import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { VscChromeClose } from "react-icons/vsc";
import { AppearanceSection } from "./AppearanceSection";
import { NotificationsSection } from "./NotificationsSection";

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
} as const;

const HEADER_SX = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  px: 2,
  height: 40,
  borderBottom: "1px solid",
  borderColor: "custom.subtleDivider",
  userSelect: "none",
} as const;

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
  py: 1,
} as const;

const NAV_ITEM_SX = {
  py: 0.5,
  px: 2,
  borderRadius: 0,
  "&.Mui-selected": {
    bgcolor: "action.selected",
    "&:hover": { bgcolor: "action.selected" },
  },
} as const;

const CONTENT_SX = {
  flex: 1,
  p: 3,
  overflowY: "auto",
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
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Settings
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close settings">
          <VscChromeClose size={14} />
        </IconButton>
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
