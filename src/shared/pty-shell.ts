// Shared so buildShellArgs (embeds) and reap-orphans (matches) can't drift
// biome-ignore lint/suspicious/noTemplateCurlyInString: POSIX shell parameter expansion
export const PTY_SHELL_EXPANSION = "${SHELL:-/bin/sh}";
