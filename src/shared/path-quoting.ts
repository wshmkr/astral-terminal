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

export function quotePathForShell(filePath: string): string {
  return quoteForPosixShell(windowsPathToWsl(filePath));
}
