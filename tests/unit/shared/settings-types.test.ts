import { describe, expect, it } from "vitest";
import {
  buildSearchUrl,
  checkCustomTemplate,
  DEFAULT_BROWSER_SETTINGS,
  looksLikeUrl,
} from "@/shared/settings-types";

describe("looksLikeUrl", () => {
  it("accepts http and https urls", () => {
    expect(looksLikeUrl("https://example.com")).toBe(true);
    expect(looksLikeUrl("http://example.com/path?q=1")).toBe(true);
  });

  it("accepts a bare domain", () => {
    expect(looksLikeUrl("example.com")).toBe(true);
    expect(looksLikeUrl("sub.example.com/page")).toBe(true);
  });

  it("rejects plain search text and blank input", () => {
    expect(looksLikeUrl("hello world")).toBe(false);
    expect(looksLikeUrl("just text")).toBe(false);
    expect(looksLikeUrl("")).toBe(false);
    expect(looksLikeUrl("   ")).toBe(false);
  });

  it("rejects a filesystem path", () => {
    expect(looksLikeUrl("/usr/local/bin")).toBe(false);
  });
});

describe("checkCustomTemplate", () => {
  it("returns null for a template with a scheme and %s placeholder", () => {
    expect(checkCustomTemplate("https://s.example/?q=%s")).toBeNull();
  });

  it("trims surrounding whitespace before checking", () => {
    expect(checkCustomTemplate("  https://s.example/?q=%s  ")).toBeNull();
  });

  it("flags a template without an http(s) scheme", () => {
    expect(checkCustomTemplate("s.example/?q=%s")).toBe("missing-scheme");
  });

  it("flags a template missing the %s placeholder", () => {
    expect(checkCustomTemplate("https://s.example/search")).toBe(
      "missing-placeholder",
    );
  });
});

describe("buildSearchUrl", () => {
  it("substitutes the url-encoded query into a known engine template", () => {
    expect(buildSearchUrl("a b", DEFAULT_BROWSER_SETTINGS)).toBe(
      "https://www.google.com/search?q=a%20b",
    );
  });

  it("encodes reserved characters in the query", () => {
    expect(buildSearchUrl("c++ & d", DEFAULT_BROWSER_SETTINGS)).toBe(
      "https://www.google.com/search?q=c%2B%2B%20%26%20d",
    );
  });

  it("uses a valid custom template", () => {
    const url = buildSearchUrl("a b", {
      ...DEFAULT_BROWSER_SETTINGS,
      searchEngineId: "custom",
      customSearchUrl: "https://s.example/find?query=%s",
    });
    expect(url).toBe("https://s.example/find?query=a%20b");
  });

  it("falls back to Google when the custom template is invalid", () => {
    const url = buildSearchUrl("a b", {
      ...DEFAULT_BROWSER_SETTINGS,
      searchEngineId: "custom",
      customSearchUrl: "not a real template",
    });
    expect(url).toBe("https://www.google.com/search?q=a%20b");
  });
});
