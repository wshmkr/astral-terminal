import { describe, expect, it } from "vitest";
import { PersistedSettingsSchema } from "@/main/settings-schema";

describe("PersistedSettingsSchema", () => {
  it("accepts a fully valid payload", () => {
    const parsed = PersistedSettingsSchema.parse({
      appearance: { appThemeId: "dark", fontSize: 14 },
      browserSettings: { searchEngineId: "google", adBlockEnabled: false },
    });
    expect(parsed.appearance).toEqual({ appThemeId: "dark", fontSize: 14 });
    expect(parsed.browserSettings).toEqual({
      searchEngineId: "google",
      adBlockEnabled: false,
    });
  });

  it("drops individual invalid fields but keeps the valid ones", () => {
    const parsed = PersistedSettingsSchema.parse({
      appearance: {
        appThemeId: "dark",
        fontSize: 999,
        accentColorId: "chartreuse",
      },
    });
    expect(parsed.appearance).toEqual({ appThemeId: "dark" });
  });

  it("drops an entire section that is not an object", () => {
    const parsed = PersistedSettingsSchema.parse({ appearance: "nope" });
    expect(parsed.appearance).toBeUndefined();
  });

  it("returns an empty object for empty input", () => {
    expect(PersistedSettingsSchema.parse({})).toEqual({});
  });

  it("fails on a non-object payload", () => {
    expect(PersistedSettingsSchema.safeParse(null).success).toBe(false);
    expect(PersistedSettingsSchema.safeParse(42).success).toBe(false);
  });
});
