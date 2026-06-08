import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REAP_TIMEOUT_MS = 15_000;

// The inner shell that buildShellArgs (pty-manager) hands to wsl.exe. An Electron
// crash or non-tree kill (Task Manager → End Task) abandons these shells and their
// sibling conhost.exe with a dead parent, so they accumulate across runs
// biome-ignore lint/suspicious/noTemplateCurlyInString: POSIX shell parameter expansion
const PTY_CMDLINE_MARKER = "${SHELL:-/bin/sh}";

// Kill only wsl.exe whose parent is gone AND whose command line is one of ours,
// then their sibling conhosts (same dead parent) — never a live session or another
// tool. Emits the count so dev logs confirm the sweep ran.
const REAP_SCRIPT = `
$alive = (Get-CimInstance Win32_Process).ProcessId
$deadParents = Get-CimInstance Win32_Process -Filter "Name='wsl.exe'" |
  Where-Object { $_.ParentProcessId -notin $alive -and $_.CommandLine -like '*${PTY_CMDLINE_MARKER}*' } |
  ForEach-Object { $_.ParentProcessId } | Select-Object -Unique
$targets = @()
if ($deadParents) {
  $targets = @(Get-CimInstance Win32_Process -Filter "Name='wsl.exe' OR Name='conhost.exe'" |
    Where-Object { $deadParents -contains $_.ParentProcessId })
  $targets | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
$targets.Count
`.trim();

// Best-effort sweep of pty shells orphaned by a previous ungraceful exit
export async function reapOrphanedPtys(): Promise<void> {
  if (process.platform !== "win32") return;
  // -EncodedCommand (base64 UTF-16LE) passes the script as one quote-free token,
  // sidestepping the mangling -Command hits as a single CreateProcess argument
  const encoded = Buffer.from(REAP_SCRIPT, "utf16le").toString("base64");
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
      { windowsHide: true, timeout: REAP_TIMEOUT_MS },
    );
    const killed = Number.parseInt(stdout.trim(), 10);
    if (Number.isFinite(killed) && killed > 0) {
      console.log(`[reap] cleared ${killed} orphaned pty process(es)`);
    }
  } catch {
    // a failed sweep just leaves the debris for the next launch to retry
  }
}
