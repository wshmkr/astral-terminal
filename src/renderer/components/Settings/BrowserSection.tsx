import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import {
  checkCustomTemplate,
  looksLikeUrl,
  type SearchEngineId,
} from "../../../shared/settings-types";
import {
  updateBrowserSettings,
  useSettingsStore,
} from "../../settings-window/store";
import {
  DIVIDER_SX,
  FIELD_LABEL_SX,
  FIELD_SX,
  LabeledSelect,
  ROOT_SX,
  SettingRow,
  SUBHEAD_SX,
  SWITCH_SX,
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

const CLEAR_BUTTON_SX = { alignSelf: "flex-start" } as const;

function homepageError(value: string): string | null {
  if (!value.trim()) return null;
  return looksLikeUrl(value)
    ? null
    : "Homepage must be a URL like https://example.com";
}

type ClearStatus = "idle" | "confirming" | "clearing" | "cleared";

const CLEAR_BUTTON_BY_STATUS: Record<
  ClearStatus,
  { color: "primary" | "error" | "success"; label: string }
> = {
  idle: { color: "primary", label: "Clear all browsing data" },
  confirming: { color: "error", label: "Click again to confirm" },
  clearing: { color: "primary", label: "Clearing browsing data..." },
  cleared: { color: "success", label: "Browsing data cleared" },
};

function customTemplateError(value: string): string | null {
  if (!value.trim()) return null;
  switch (checkCustomTemplate(value)) {
    case "missing-scheme":
      return "Must start with http:// or https://";
    case "missing-placeholder":
      return "Must contain %s for the search query";
    case null:
      return null;
  }
}

export function BrowserSection() {
  const searchEngineId = useSettingsStore(
    (s) => s.browserSettings.searchEngineId,
  );
  const customSearchUrl = useSettingsStore(
    (s) => s.browserSettings.customSearchUrl,
  );
  const adBlockEnabled = useSettingsStore(
    (s) => s.browserSettings.adBlockEnabled,
  );
  const sendGpc = useSettingsStore((s) => s.browserSettings.sendGpc);
  const homepage = useSettingsStore((s) => s.browserSettings.homepage);

  const [customDraft, setCustomDraft] = useState(customSearchUrl);
  useEffect(() => {
    setCustomDraft(customSearchUrl);
  }, [customSearchUrl]);

  const [homepageDraft, setHomepageDraft] = useState(homepage);
  useEffect(() => {
    setHomepageDraft(homepage);
  }, [homepage]);

  const [clearStatus, setClearStatus] = useState<ClearStatus>("idle");

  useEffect(
    () =>
      window.app.onSettingsFade((visible) => {
        if (!visible) setClearStatus("idle");
      }),
    [],
  );

  const commitCustom = () => {
    const trimmed = customDraft.trim();
    if (trimmed !== customDraft) setCustomDraft(trimmed);
    if (trimmed === customSearchUrl) return;
    if (customTemplateError(trimmed) !== null) return;
    updateBrowserSettings({ customSearchUrl: trimmed });
  };

  const commitHomepage = () => {
    const trimmed = homepageDraft.trim();
    if (trimmed !== homepageDraft) setHomepageDraft(trimmed);
    if (trimmed === homepage) return;
    if (homepageError(trimmed) !== null) return;
    updateBrowserSettings({ homepage: trimmed });
  };

  const handleClearData = async () => {
    if (clearStatus !== "confirming") {
      setClearStatus("confirming");
      return;
    }
    setClearStatus("clearing");
    try {
      await window.app.clearBrowsingData();
      setClearStatus("cleared");
    } catch {
      setClearStatus("idle");
    }
  };

  const customError = customTemplateError(customDraft);
  const homepageDraftError = homepageError(homepageDraft);

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
            error={customError !== null}
            helperText={
              customError ?? "Use %s where the search query should go."
            }
            onChange={(e) => setCustomDraft(e.target.value)}
            onBlur={commitCustom}
            sx={CUSTOM_FIELD_SX}
          />
        </Box>
      )}

      <Box sx={FIELD_SX}>
        <Typography sx={FIELD_LABEL_SX}>Homepage</Typography>
        <TextField
          size="small"
          value={homepageDraft}
          placeholder="https://example.com"
          error={homepageDraftError !== null}
          helperText={homepageDraftError ?? undefined}
          onChange={(e) => setHomepageDraft(e.target.value)}
          onBlur={commitHomepage}
          sx={CUSTOM_FIELD_SX}
        />
      </Box>

      <Divider sx={DIVIDER_SX} />

      <Typography variant="subtitle1" sx={SUBHEAD_SX}>
        Browsing data
      </Typography>

      <Button
        variant="outlined"
        size="small"
        color={CLEAR_BUTTON_BY_STATUS[clearStatus].color}
        disabled={clearStatus === "clearing"}
        onClick={handleClearData}
        sx={CLEAR_BUTTON_SX}
      >
        {CLEAR_BUTTON_BY_STATUS[clearStatus].label}
      </Button>

      <Divider sx={DIVIDER_SX} />

      <Typography variant="subtitle1" sx={SUBHEAD_SX}>
        Privacy
      </Typography>

      <SettingRow
        title="Block ads and trackers"
        description="Filter network requests and hide ad placeholders on web pages."
        control={
          <Switch
            size="small"
            sx={SWITCH_SX}
            checked={adBlockEnabled}
            onChange={(_, checked) =>
              updateBrowserSettings({ adBlockEnabled: checked })
            }
          />
        }
      />

      <SettingRow
        title="Send Global Privacy Control signal"
        description="Asks sites to not sell or share your data. (Sec-GPC)"
        control={
          <Switch
            size="small"
            sx={SWITCH_SX}
            checked={sendGpc}
            onChange={(_, checked) =>
              updateBrowserSettings({ sendGpc: checked })
            }
          />
        }
      />
    </Box>
  );
}
