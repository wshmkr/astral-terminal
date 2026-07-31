import { describe, expect, it } from "vitest";
import { isValidSurfaceId } from "@/shared/surface-id";

describe("isValidSurfaceId", () => {
  it("accepts ids made of letters, digits, and _ . -", () => {
    expect(isValidSurfaceId("abc")).toBe(true);
    expect(isValidSurfaceId("A_b.c-1")).toBe(true);
  });

  it("rejects the empty string", () => {
    expect(isValidSurfaceId("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidSurfaceId(undefined)).toBe(false);
    expect(isValidSurfaceId(null)).toBe(false);
    expect(isValidSurfaceId(123)).toBe(false);
    expect(isValidSurfaceId({})).toBe(false);
  });

  it("rejects characters outside the allowed set", () => {
    expect(isValidSurfaceId("has space")).toBe(false);
    expect(isValidSurfaceId("slash/here")).toBe(false);
    expect(isValidSurfaceId("colon:here")).toBe(false);
  });

  it("accepts an id at the 128-char limit but not beyond it", () => {
    expect(isValidSurfaceId("a".repeat(128))).toBe(true);
    expect(isValidSurfaceId("a".repeat(129))).toBe(false);
  });
});
