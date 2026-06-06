#!/bin/sh
# __ASTRAL_CLI_MARKER__
# astral — query the Astral Terminal instance that spawned this shell.
# Installed and updated automatically by the app; edits here are overwritten.

CLI_VERSION=__ASTRAL_CLI_VERSION__

identify() {
  if [ -z "${ASTRAL_SURFACE_ID:-}" ]; then
    echo "astral: not running inside an Astral Terminal shell" >&2
    return 1
  fi
  printf '{"surfaceId":"%s","pid":%s,"version":"%s"}\n' \
    "$ASTRAL_SURFACE_ID" "${ASTRAL_PID:-0}" "${ASTRAL_VERSION:-}"
}

usage() {
  cat <<EOF
astral $CLI_VERSION — query the running Astral Terminal

Usage:
  astral identify    Print this surface's identity as JSON
  astral --version   Print the CLI version
  astral --help      Show this help
EOF
}

case "${1:-}" in
  identify) identify ;;
  --version | -v) echo "$CLI_VERSION" ;;
  --help | -h | "") usage ;;
  *)
    echo "astral: unknown command: $1" >&2
    usage >&2
    exit 1
    ;;
esac
