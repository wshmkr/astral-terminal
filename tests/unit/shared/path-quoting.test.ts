import { describe, expect, it } from "vitest";
import { quoteForPosixShell, windowsPathToWsl } from "@/shared/path-quoting";

describe("quoteForPosixShell", () => {
  it("wraps a plain path in double quotes", () => {
    expect(quoteForPosixShell("/home/user/file")).toBe('"/home/user/file"');
  });

  it("wraps a path containing spaces without escaping them", () => {
    expect(quoteForPosixShell("/home/my user/file")).toBe(
      '"/home/my user/file"',
    );
  });

  it("escapes double quotes", () => {
    expect(quoteForPosixShell('a"b')).toBe('"a\\"b"');
  });

  it("escapes backslashes", () => {
    expect(quoteForPosixShell("a\\b")).toBe('"a\\\\b"');
  });

  it("escapes dollar signs and backticks so they are not expanded", () => {
    expect(quoteForPosixShell("a$b")).toBe('"a\\$b"');
    expect(quoteForPosixShell("a`b")).toBe('"a\\`b"');
  });

  it("returns just the quotes for an empty string", () => {
    expect(quoteForPosixShell("")).toBe('""');
  });
});

describe("windowsPathToWsl", () => {
  it("maps a backslash drive path to /mnt", () => {
    expect(windowsPathToWsl("C:\\foo")).toBe("/mnt/c/foo");
  });

  it("maps a forward-slash drive path to /mnt", () => {
    expect(windowsPathToWsl("C:/foo")).toBe("/mnt/c/foo");
  });

  it("lowercases the drive letter and converts every separator", () => {
    expect(windowsPathToWsl("D:\\a\\b\\c")).toBe("/mnt/d/a/b/c");
  });

  it("leaves a path without a drive letter unchanged", () => {
    expect(windowsPathToWsl("/home/user")).toBe("/home/user");
    expect(windowsPathToWsl("relative/path")).toBe("relative/path");
  });
});
