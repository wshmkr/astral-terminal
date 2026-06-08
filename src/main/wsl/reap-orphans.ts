import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PTY_SHELL_EXPANSION } from "../../shared/pty-shell";

const execFileAsync = promisify(execFile);

const REAP_TIMEOUT_MS = 15_000;

// Ungraceful Electron exits orphan our wsl.exe shells + sibling conhosts; match
// narrowly (dead parent AND our shell signature) so live sessions are spared.
const REAP_SCRIPT = `
$allProcesses = Get-CimInstance Win32_Process
$alivePids = $allProcesses.ProcessId
$deadParentPids = $allProcesses |
  Where-Object { $_.Name -eq 'wsl.exe' -and $_.ParentProcessId -notin $alivePids -and $_.CommandLine -like '*${PTY_SHELL_EXPANSION}*' } |
  ForEach-Object { $_.ParentProcessId } | Select-Object -Unique
$orphaned = @()
if ($deadParentPids) {
  $orphaned = @($allProcesses |
    Where-Object { ($_.Name -eq 'wsl.exe' -or $_.Name -eq 'conhost.exe') -and $deadParentPids -contains $_.ParentProcessId })
  $orphaned | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
$orphaned.Count
`.trim();

export async function reapOrphanedPtys(): Promise<void> {
  if (process.platform !== "win32") return;
  // base64 -EncodedCommand dodges the quote-mangling -Command hits via one arg
  const encoded = Buffer.from(REAP_SCRIPT, "utf16le").toString("base64");
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
      { windowsHide: true, timeout: REAP_TIMEOUT_MS },
    );
    const reapedCount = Number.parseInt(stdout.trim(), 10);
    if (reapedCount > 0) {
      console.log(`[reap] cleared ${reapedCount} orphaned pty process(es)`);
    }
  } catch {
    // best-effort; debris is retried next launch
  }
}
