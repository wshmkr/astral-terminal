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

export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;
export const MIN_UI_SCALE = 0.8;
export const MAX_UI_SCALE = 1.5;

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

// Per-field tolerance: every field becomes optional and catches its own errors
// to undefined; undefined keys are stripped from output so a spread over a
// defaults object won't clobber them. Adding a new field to the shape inherits
// this tolerance automatically — there is no per-field discipline to forget.
// The full (resolved) type is recovered with `Required<z.infer<...>>`.
function tolerantPartial<S extends z.ZodRawShape>(shape: S) {
  type Out = { [K in keyof S]?: z.infer<S[K]> };
  const tolerantShape: Record<string, z.ZodTypeAny> = {};
  for (const [key, field] of Object.entries(shape)) {
    tolerantShape[key] = (field as z.ZodTypeAny).optional().catch(undefined);
  }
  return z.object(tolerantShape).transform((obj): Out => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v;
    }
    return out as Out;
  });
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

// Settings sub-schemas. Built via `tolerantPartial` so the result is a Partial
// of the resolved type: invalid or missing fields are dropped, and the renderer
// fills in the rest by spreading over its DEFAULT_* constants. The defaults
// (not the schemas) own the canonical resolved values.

const AppearanceSchema = tolerantPartial({
  appThemeId: AppThemeIdSchema,
  terminalThemeId: TerminalThemeIdSchema,
  fontFamily: FontFamilyIdSchema,
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE),
  uiScale: z.number().min(MIN_UI_SCALE).max(MAX_UI_SCALE),
  accentColorId: AccentColorIdSchema,
});

const NotificationSettingsSchema = tolerantPartial({
  soundEnabled: z.boolean(),
  osNotificationsEnabled: z.boolean(),
});

const UpdateSettingsSchema = tolerantPartial({
  autoEnabled: z.boolean(),
});

const TerminalSettingsSchema = tolerantPartial({
  wslDistro: z.string().nullable(),
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

// The schemas produce Partial<...>; the in-memory/state types are the full
// resolved shape, recovered with Required<>. DEFAULT_* constants in the
// renderer must satisfy these (compile-time enforced), so adding a new field
// to a schema shape forces a default to be added too.
export type AppearanceSettings = Required<z.infer<typeof AppearanceSchema>>;
export type NotificationSettings = Required<
  z.infer<typeof NotificationSettingsSchema>
>;
export type UpdateSettings = Required<z.infer<typeof UpdateSettingsSchema>>;
export type TerminalSettings = Required<z.infer<typeof TerminalSettingsSchema>>;
export type PersistedSettings = z.infer<typeof PersistedSettingsSchema>;
