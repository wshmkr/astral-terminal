import { z } from "zod";
import type { PaneNode, Surface } from "./types";

// Picklist sub-schemas. Exported as types because they're referenced
// throughout the renderer/main code where individual field types are needed.

const AppThemeIdSchema = z.enum(["dark", "light", "black"]);
const TerminalThemeIdSchema = z.enum([
  "one-half-dark",
  "one-half-light",
  "dracula",
  "alucard",
  "github-dark",
  "github-light",
]);
const FontFamilyIdSchema = z.enum([
  "jetbrains-mono",
  "cascadia-code",
  "consolas",
  "system-monospace",
]);
const AccentColorIdSchema = z.enum([
  "blue",
  "purple",
  "pink",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
]);

export type AppThemeId = z.infer<typeof AppThemeIdSchema>;
export type TerminalThemeId = z.infer<typeof TerminalThemeIdSchema>;
export type FontFamilyId = z.infer<typeof FontFamilyIdSchema>;
export type AccentColorId = z.infer<typeof AccentColorIdSchema>;

// Numeric bounds must stay in sync with src/renderer/theme/fonts.ts constants.
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_DEFAULT = 16;
const UI_SCALE_MIN = 0.8;
const UI_SCALE_MAX = 1.5;
const UI_SCALE_DEFAULT = 1;

// Surface: simple discriminated union.

const SurfaceSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("terminal"),
    cwd: z.string(),
  }),
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("browser"),
    url: z.string(),
  }),
]) satisfies z.ZodType<Surface>;

// Parse each array item independently; replace failures with null and filter.
function dropInvalid<T extends z.ZodTypeAny>(item: T) {
  return z
    .array(item.catch(null as never))
    .transform((arr) => arr.filter((x): x is z.infer<T> => x !== null));
}

// PaneNode: recursive discriminated union with shape-correcting transforms.

const PaneNodeSchema: z.ZodType<PaneNode> = z.lazy(() =>
  z.union([LeafPaneSchema, SplitPaneSchema]),
);

const LeafPaneSchema = z
  .object({
    id: z.string(),
    kind: z.literal("leaf"),
    surfaces: dropInvalid(SurfaceSchema),
    activeSurfaceId: z.string().optional(),
  })
  .refine((o) => o.surfaces.length > 0)
  .transform((o) => {
    // refine above guarantees this, but TS can't follow it
    const firstSurface = o.surfaces[0] as Surface;
    return {
      id: o.id,
      kind: "leaf" as const,
      surfaces: o.surfaces,
      activeSurfaceId:
        o.activeSurfaceId && o.surfaces.some((s) => s.id === o.activeSurfaceId)
          ? o.activeSurfaceId
          : firstSurface.id,
    };
  });

const SplitPaneSchema = z
  .object({
    id: z.string(),
    kind: z.literal("split"),
    direction: z.enum(["horizontal", "vertical"]),
    children: dropInvalid(PaneNodeSchema),
    sizes: z.array(z.number()).optional(),
  })
  .refine((o) => o.children.length > 0)
  .transform((o) => ({
    id: o.id,
    kind: "split" as const,
    direction: o.direction,
    children: o.children,
    sizes:
      o.sizes && o.sizes.length === o.children.length ? o.sizes : undefined,
  }));

// Settings sub-schemas. Each leaf field catches to a default so invalid values
// degrade in place rather than dropping the whole object.

const AppearanceSchema = z.object({
  appThemeId: AppThemeIdSchema.catch("dark"),
  terminalThemeId: TerminalThemeIdSchema.catch("one-half-dark"),
  fontFamily: FontFamilyIdSchema.catch("jetbrains-mono"),
  fontSize: z
    .number()
    .min(FONT_SIZE_MIN)
    .max(FONT_SIZE_MAX)
    .catch(FONT_SIZE_DEFAULT),
  uiScale: z
    .number()
    .min(UI_SCALE_MIN)
    .max(UI_SCALE_MAX)
    .catch(UI_SCALE_DEFAULT),
  accentColorId: AccentColorIdSchema.catch("blue"),
});

const NotificationSettingsSchema = z.object({
  soundEnabled: z.boolean().catch(false),
  osNotificationsEnabled: z.boolean().catch(false),
});

const UpdateSettingsSchema = z.object({
  autoEnabled: z.boolean().catch(true),
});

const TerminalSettingsSchema = z.object({
  wslDistro: z.string().nullable().catch(null),
});

const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  layout: PaneNodeSchema,
});

export const PersistedSettingsSchema = z.object({
  workspaces: dropInvalid(WorkspaceSchema),
  activeWorkspaceId: z.string().nullable().catch(null),
  sidebarWidth: z.number().optional().catch(undefined),
  appearance: AppearanceSchema.optional().catch(undefined),
  notificationSettings: NotificationSettingsSchema.optional().catch(undefined),
  updateSettings: UpdateSettingsSchema.optional().catch(undefined),
  terminalSettings: TerminalSettingsSchema.optional().catch(undefined),
});

export type AppearanceSettings = z.infer<typeof AppearanceSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;
export type TerminalSettings = z.infer<typeof TerminalSettingsSchema>;
export type PersistedSettings = z.infer<typeof PersistedSettingsSchema>;
