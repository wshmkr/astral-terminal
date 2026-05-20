import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import Fade from "@mui/material/Fade";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { VscArrowRight } from "react-icons/vsc";
import {
  agentProviders,
  isAgentHookInstalled,
} from "../../../shared/agent-hooks";
import type {
  AccentColorId,
  AppThemeId,
  TerminalThemeId,
  WslDistro,
} from "../../../shared/types";
import { loadAppConfig } from "../../app/config-loader";
import { useAgentHookToggle } from "../../hooks/useAgentHookToggle";
import {
  dismissWelcome,
  setAccentColor,
  setAgentHook,
  setAgentHookStatuses,
  setAppTheme,
  setTerminalTheme,
  setWslDistro,
  useWorkspaceStore,
} from "../../store";
import { resolveAccentHex } from "../../theme/accent-colors";
import { MONO_FONT_STACK } from "../../theme/fonts";
import {
  APP_PALETTES,
  APP_THEME_OPTIONS,
  DARK_PALETTE,
  withAccent,
} from "../../theme/palettes";
import {
  TERMINAL_THEME_OPTIONS,
  TERMINAL_THEMES,
} from "../../theme/terminal-themes";
import {
  HooksHelpIcon,
  NoHooksAlert,
  PROVIDER_ICONS,
} from "../Settings/NotificationsSection";
import {
  FIELD_LABEL_SX,
  FIELD_SX,
  LabeledSelect,
  SettingRow,
} from "../Settings/shared";
import { AccentSwatchPicker } from "../ui/AccentSwatchPicker";
import { TITLE_BAR_HEIGHT } from "../ui/TitleBarButton";
import { ThemePreview } from "./ThemePreview";

const PAPER_SX = {
  userSelect: "none",
  overflow: "auto",
  bgcolor: DARK_PALETTE.bgPaper,
  backgroundImage: "none",
  p: 4,
} as const;

const CONTENT_STACK_SX = {
  width: "100%",
  maxWidth: 900,
  flexShrink: 0,
  m: "auto",
} as const;

const HEADER_TITLE_SX = {
  mb: 0.5,
  fontFamily: MONO_FONT_STACK,
  fontWeight: 700,
  letterSpacing: "-0.02em",
} as const;

const SUBHEAD_BASE_SX = {
  fontFamily: MONO_FONT_STACK,
  fontWeight: 700,
  letterSpacing: "0.08em",
  fontSize: 13,
} as const;
const SUBHEAD_INDEX_SX = {
  ...SUBHEAD_BASE_SX,
  color: "primary.main",
} as const;
const SUBHEAD_LABEL_SX = {
  ...SUBHEAD_BASE_SX,
  textTransform: "uppercase",
  color: "text.primary",
} as const;

const PREVIEW_COL_SX = {
  flex: "0 0 480px",
  aspectRatio: "4 / 3",
  alignSelf: "center",
} as const;

const ALERT_SX = {
  py: 0,
  textWrap: "balance",
  alignItems: "center",
  "& .MuiAlert-message": { py: 0.5, fontSize: 12, lineHeight: 1.4 },
  "& .MuiAlert-icon": { mr: 1, py: 0.5 },
} as const;

const BUTTON_SX = {
  py: 1.5,
  fontSize: 16,
  fontFamily: MONO_FONT_STACK,
  letterSpacing: "0.05em",
} as const;

const DEFAULT_DISTRO_VALUE = "__default__";

export function WelcomeDialog() {
  const persistedAppTheme = useWorkspaceStore((s) => s.appearance.appThemeId);
  const persistedTerminalTheme = useWorkspaceStore(
    (s) => s.appearance.terminalThemeId,
  );
  const persistedAccentColor = useWorkspaceStore(
    (s) => s.appearance.accentColorId,
  );
  const persistedWslDistro = useWorkspaceStore(
    (s) => s.terminalSettings.wslDistro,
  );
  const hookStatuses = useWorkspaceStore((s) => s.agentHookStatuses);
  const { toggle, pending, errors } = useAgentHookToggle(setAgentHook);

  const [draftAppTheme, setDraftAppTheme] =
    useState<AppThemeId>(persistedAppTheme);
  const [draftTerminalTheme, setDraftTerminalTheme] = useState<TerminalThemeId>(
    persistedTerminalTheme,
  );
  const [draftAccentColor, setDraftAccentColor] =
    useState<AccentColorId>(persistedAccentColor);
  const [draftWslDistro, setDraftWslDistro] = useState<string | null>(
    persistedWslDistro,
  );
  const [isWindows, setIsWindows] = useState<boolean | null>(null);
  const [distros, setDistros] = useState<WslDistro[] | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await loadAppConfig();
      let loadedDistros: WslDistro[] = [];
      if (config.platform.isWindows) {
        try {
          loadedDistros = await window.app.listWslDistros();
        } catch (err) {
          console.error("listWslDistros failed:", err);
        }
      }
      try {
        const statuses = await window.app.getAgentHookStatuses();
        if (cancelled) return;
        setAgentHookStatuses(statuses);
      } catch (err) {
        console.error("Failed to read agent hook statuses:", err);
      }
      if (cancelled) return;
      setIsWindows(config.platform.isWindows);
      setDistros(loadedDistros);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const noHooksEnabled = agentProviders.every(
    (p) => !isAgentHookInstalled(hookStatuses[p.name]),
  );

  const shellSupported =
    isWindows === true && distros !== null && distros.length > 0;
  const selectedDistro = distros?.find((d) =>
    draftWslDistro ? d.name === draftWslDistro : d.isDefault,
  );
  const selectedIsSystem = selectedDistro?.isSystem ?? false;

  const handleGetStarted = () => {
    setAppTheme(draftAppTheme);
    setTerminalTheme(draftTerminalTheme);
    setAccentColor(draftAccentColor);
    if (shellSupported) setWslDistro(draftWslDistro);
    setOpen(false);
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={() => {}}
      slotProps={{
        transition: { appear: false, onExited: dismissWelcome },
        paper: { elevation: 0, sx: PAPER_SX },
        backdrop: { sx: { top: TITLE_BAR_HEIGHT }, appear: false },
      }}
      sx={{ top: TITLE_BAR_HEIGHT }}
      aria-labelledby="welcome-title"
    >
      <Fade in={ready} timeout={300}>
        <Stack direction="row" spacing={4} sx={CONTENT_STACK_SX}>
          <Stack sx={{ width: 388, flexShrink: 0 }}>
            <Box sx={{ mb: 4 }}>
              <Typography id="welcome-title" variant="h4" sx={HEADER_TITLE_SX}>
                Welcome to{" "}
                <Box component="span" sx={{ color: "primary.main" }}>
                  Astral
                </Box>
                .
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Configure defaults. Editable anytime via settings.
              </Typography>
            </Box>

            <Stack spacing={4}>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "baseline" }}
                >
                  <Typography sx={SUBHEAD_INDEX_SX}>01</Typography>
                  <Typography sx={SUBHEAD_LABEL_SX}>Appearance</Typography>
                </Stack>
                <Stack spacing={1.5} sx={{ pl: 3.25 }}>
                  <LabeledSelect
                    label="App theme"
                    value={draftAppTheme}
                    options={APP_THEME_OPTIONS}
                    onChange={setDraftAppTheme}
                    maxWidth={240}
                  />
                  <LabeledSelect
                    label="Terminal theme"
                    value={draftTerminalTheme}
                    options={TERMINAL_THEME_OPTIONS}
                    onChange={setDraftTerminalTheme}
                    maxWidth={240}
                  />
                  <Box sx={FIELD_SX}>
                    <Typography sx={FIELD_LABEL_SX}>Accent color</Typography>
                    <AccentSwatchPicker
                      value={draftAccentColor}
                      onChange={setDraftAccentColor}
                    />
                  </Box>
                </Stack>
              </Stack>

              {shellSupported && distros && (
                <Stack spacing={1.5}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "baseline" }}
                  >
                    <Typography sx={SUBHEAD_INDEX_SX}>02</Typography>
                    <Typography sx={SUBHEAD_LABEL_SX}>Shell</Typography>
                  </Stack>
                  <Stack spacing={1.5} sx={{ pl: 3.25 }}>
                    <LabeledSelect
                      label="WSL distro"
                      value={draftWslDistro ?? DEFAULT_DISTRO_VALUE}
                      options={[
                        {
                          value: DEFAULT_DISTRO_VALUE,
                          label: distros.find((d) => d.isDefault)
                            ? `Default (${distros.find((d) => d.isDefault)?.name})`
                            : "Default",
                        },
                        ...distros.map((d) => ({
                          value: d.name,
                          label: d.isSystem ? (
                            <Box
                              component="span"
                              sx={{ color: "text.disabled" }}
                            >
                              {d.name}
                            </Box>
                          ) : (
                            d.name
                          ),
                        })),
                      ]}
                      onChange={(value) =>
                        setDraftWslDistro(
                          value === DEFAULT_DISTRO_VALUE ? null : value,
                        )
                      }
                      maxWidth={240}
                      error={selectedIsSystem}
                    />
                  </Stack>
                </Stack>
              )}

              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "baseline" }}
                >
                  <Typography sx={SUBHEAD_INDEX_SX}>
                    {shellSupported ? "03" : "02"}
                  </Typography>
                  <Typography sx={SUBHEAD_LABEL_SX}>
                    Install agent hooks
                  </Typography>
                  <HooksHelpIcon sx={{ alignSelf: "center" }} />
                </Stack>
                <Stack spacing={1.5} sx={{ pl: 3.25 }}>
                  {agentProviders.map((p) => {
                    const { icon: Icon, color } = PROVIDER_ICONS[p.name];
                    const error = errors[p.name];
                    return (
                      <SettingRow
                        key={p.name}
                        title={p.name}
                        icon={<Icon size={16} color={color} />}
                        description={error}
                        descriptionTone={error ? "error" : "default"}
                        control={
                          <Checkbox
                            size="small"
                            sx={{ p: 0.5 }}
                            checked={isAgentHookInstalled(hookStatuses[p.name])}
                            disabled={!!pending[p.name]}
                            onChange={(_, checked) => toggle(p.name, checked)}
                          />
                        }
                      />
                    );
                  })}
                </Stack>
              </Stack>
            </Stack>

            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {selectedIsSystem ? (
                <Alert severity="error" variant="outlined" sx={ALERT_SX}>
                  {selectedDistro?.name} is a system distro for containers and
                  is not meant as an interactive shell.
                </Alert>
              ) : (
                <NoHooksAlert
                  sx={[ALERT_SX, !noHooksEnabled && { visibility: "hidden" }]}
                />
              )}
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleGetStarted}
                autoFocus
                endIcon={<VscArrowRight />}
                sx={BUTTON_SX}
              >
                Get started
              </Button>
            </Stack>
          </Stack>

          <Box sx={PREVIEW_COL_SX}>
            <ThemePreview
              appPalette={withAccent(
                APP_PALETTES[draftAppTheme],
                resolveAccentHex(draftAccentColor),
              )}
              terminalTheme={TERMINAL_THEMES[draftTerminalTheme]}
            />
          </Box>
        </Stack>
      </Fade>
    </Dialog>
  );
}
