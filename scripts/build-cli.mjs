import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Keep in sync with CLI_VERSION in src/main/astral-cli/installer.ts
const CLI_VERSION = "1.0";
const ARCHES = ["amd64", "arm64"];

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../..");
const cliDir = path.join(rootDir, "cli");
const outDir = path.join(rootDir, "dist-cli");

const { name, version } = JSON.parse(
  readFileSync(path.join(rootDir, "package.json"), "utf-8"),
);
const marker = `${name}:cli:v${CLI_VERSION}`;

mkdirSync(outDir, { recursive: true });

for (const arch of ARCHES) {
  const outFile = path.join(outDir, `astral-linux-${arch}`);
  const result = spawnSync(
    "go",
    [
      "build",
      "-trimpath",
      "-ldflags",
      `-s -w -X main.version=${version} -X main.marker=${marker}`,
      "-o",
      outFile,
      "./cmd/astral",
    ],
    {
      cwd: cliDir,
      env: { ...process.env, CGO_ENABLED: "0", GOOS: "linux", GOARCH: arch },
      stdio: "inherit",
    },
  );
  if (result.error) {
    console.error(
      result.error.code === "ENOENT"
        ? "build:cli requires Go, but `go` was not found on PATH. Install it with `winget install GoLang.Go`."
        : `build:cli failed to run go: ${result.error.message}`,
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`build:cli failed for linux/${arch}`);
    process.exit(result.status ?? 1);
  }
  console.log(`built ${path.relative(rootDir, outFile)}`);
}
