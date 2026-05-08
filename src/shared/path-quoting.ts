export function quoteForPosixShell(path: string): string {
  return `"${path.replace(/(["\\$`])/g, "\\$1")}"`;
}

const WIN_DRIVE_RE = /^([A-Za-z]):[\\/]/;

export function windowsPathToWsl(path: string): string {
  const m = WIN_DRIVE_RE.exec(path);
  if (!m?.[1]) return path;
  return `/mnt/${m[1].toLowerCase()}/${path.slice(3).replace(/\\/g, "/")}`;
}
