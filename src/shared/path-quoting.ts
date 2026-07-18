// Single-quote style: neutralizes every shell metacharacter, including `!`,
// which double quotes leave live to history expansion in interactive bash.
export function quoteForPosixShell(path: string): string {
  return `'${path.replace(/'/g, "'\\''")}'`;
}

const WIN_DRIVE_RE = /^([A-Za-z]):[\\/]/;
// Files living inside WSL surface as \\wsl$\<distro>\... or \\wsl.localhost\<distro>\...
const WSL_UNC_RE = /^\\\\wsl(?:\$|\.localhost)\\[^\\]+/i;

export function windowsPathToWsl(path: string): string {
  const unc = WSL_UNC_RE.exec(path);
  if (unc) {
    const rest = path.slice(unc[0].length).replace(/\\/g, "/");
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  const m = WIN_DRIVE_RE.exec(path);
  if (!m?.[1]) return path;
  return `/mnt/${m[1].toLowerCase()}/${path.slice(3).replace(/\\/g, "/")}`;
}

// The app's shells are always POSIX (WSL on Windows, native elsewhere), and
// windowsPathToWsl leaves non-Windows paths untouched — so always translate,
// rather than guessing from the surface's (possibly stale or "~") cwd.
export function quotePathForShell(filePath: string): string {
  return quoteForPosixShell(windowsPathToWsl(filePath));
}
