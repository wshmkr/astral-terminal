import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { SearchEngineId } from "../../../shared/settings-types";
import {
  updateBrowserSettings,
  useSettingsStore,
} from "../../settings-window/store";
import {
  FIELD_LABEL_SX,
  FIELD_SX,
  LabeledSelect,
  ROOT_SX,
  SUBHEAD_SX,
} from "./shared";

const ENGINE_OPTIONS: ReadonlyArray<{
  value: SearchEngineId;
  label: string;
}> = [
  { value: "google", label: "Google" },
  { value: "bing", label: "Bing" },
  { value: "duckduckgo", label: "DuckDuckGo" },
  { value: "custom", label: "Custom" },
];

const CUSTOM_FIELD_SX = { maxWidth: 420 } as const;

export function BrowserSection() {
  const searchEngineId = useSettingsStore(
    (s) => s.browserSettings.searchEngineId,
  );
  const customSearchUrl = useSettingsStore(
    (s) => s.browserSettings.customSearchUrl,
  );

  const [customDraft, setCustomDraft] = useState(customSearchUrl);
  useEffect(() => {
    setCustomDraft(customSearchUrl);
  }, [customSearchUrl]);

  const commitCustom = () => {
    if (customDraft === customSearchUrl) return;
    updateBrowserSettings({ customSearchUrl: customDraft });
  };

  return (
    <Box sx={ROOT_SX}>
      <Typography variant="subtitle1" sx={SUBHEAD_SX}>
        Search
      </Typography>

      <LabeledSelect
        label="Search engine"
        value={searchEngineId}
        options={ENGINE_OPTIONS}
        onChange={(value) => updateBrowserSettings({ searchEngineId: value })}
        maxWidth={320}
      />

      {searchEngineId === "custom" && (
        <Box sx={FIELD_SX}>
          <Typography sx={FIELD_LABEL_SX}>Search URL</Typography>
          <TextField
            size="small"
            value={customDraft}
            placeholder="https://example.com/search?q=%s"
            helperText="Use %s where the search query should go."
            onChange={(e) => setCustomDraft(e.target.value)}
            onBlur={commitCustom}
            sx={CUSTOM_FIELD_SX}
          />
        </Box>
      )}
    </Box>
  );
}
