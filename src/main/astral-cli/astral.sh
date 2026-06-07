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
  case "${ASTRAL_PID:-}" in
    '' | *[!0-9]*)
      pid=0
      ;;
    *)
      # strip leading zeros — invalid in JSON numbers
      pid=${ASTRAL_PID#"${ASTRAL_PID%%[!0]*}"}
      pid=${pid:-0}
      ;;
  esac
  printf '{"surfaceId":"%s","pid":%s,"version":"%s"}\n' \
    "$ASTRAL_SURFACE_ID" "$pid" "${ASTRAL_VERSION:-}"
}

host_cache() {
  printf '%s/astral-host-%s' \
    "${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}" "${ASTRAL_PORT:-0}"
}

# Hosts that might reach the Windows app from inside WSL, best first: a previously working host,
# loopback (mirrored networking), then the NAT default gateway / resolv.conf nameserver.
candidate_hosts() {
  {
    [ -f "$(host_cache)" ] && cat "$(host_cache)"
    echo 127.0.0.1
    ip route 2>/dev/null | awk '/^default/ {print $3; exit}'
    awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf 2>/dev/null
  } | awk 'NF && !seen[$0]++'
}

# Open one connection, send the auth line then the request line, print the request's reply (the
# second response line). Non-zero exit means the host was unreachable.
tcp_exchange() {
  _to=""
  command -v timeout >/dev/null 2>&1 && _to="timeout 3"
  if command -v bash >/dev/null 2>&1; then
    ASTRAL_H=$1 ASTRAL_P=$2 ASTRAL_AUTH=$3 ASTRAL_REQ=$4 $_to bash -c '
      # silence bash redirection errors here: a refused candidate is expected, not an error
      exec 2>/dev/null
      exec 3<>"/dev/tcp/$ASTRAL_H/$ASTRAL_P" || exit 1
      printf "%s\n%s\n" "$ASTRAL_AUTH" "$ASTRAL_REQ" >&3
      IFS= read -r _discard <&3 || exit 1
      IFS= read -r _reply <&3 || exit 1
      printf "%s\n" "$_reply"
    '
    return $?
  fi
  if command -v nc >/dev/null 2>&1; then
    # nc won't close on stdin EOF without a half-close flag, and it differs by variant
    # (Ncat and busybox need none); derive it from the help text
    _nc_close=""
    case "$(nc -h 2>&1)" in
      *Ncat*) ;;
      *"Shutdown the network socket after EOF"*) _nc_close="-N" ;;
      *"quit after EOF"*) _nc_close="-q 0" ;;
    esac
    printf '%s\n%s\n' "$3" "$4" | $_to nc $_nc_close "$1" "$2" 2>/dev/null | sed -n '2p'
    return 0
  fi
  echo "astral: need bash or nc to reach Astral Terminal" >&2
  return 127
}

call() {
  method=$1
  if [ -z "$method" ]; then
    echo "astral: usage: astral call <method> [json-params]" >&2
    return 2
  fi
  # method goes unescaped into the request JSON; a quote or newline could forge/split the frame
  case "$method" in
    *[!A-Za-z0-9._-]*)
      echo "astral: invalid method name: $method" >&2
      return 2
      ;;
  esac
  params=${2:-null}
  if [ -z "${ASTRAL_PORT:-}" ] || [ -z "${ASTRAL_TOKEN:-}" ]; then
    echo "astral: not connected to Astral Terminal (ASTRAL_PORT/ASTRAL_TOKEN unset)" >&2
    return 1
  fi
  auth=$(printf '{"id":"auth","method":"auth.hello","params":{"token":"%s"}}' \
    "$ASTRAL_TOKEN")
  req=$(printf '{"id":"call","method":"%s","params":%s}' "$method" "$params")
  for host in $(candidate_hosts); do
    reply=$(tcp_exchange "$host" "$ASTRAL_PORT" "$auth" "$req") &&
      [ -n "$reply" ] || continue
    printf '%s\n' "$host" >"$(host_cache)" 2>/dev/null || true
    printf '%s\n' "$reply"
    return 0
  done
  echo "astral: could not reach Astral Terminal on port $ASTRAL_PORT" >&2
  return 1
}

usage() {
  cat <<EOF
Astral Terminal CLI v$CLI_VERSION

Usage:
  astral identify              Print this surface's identity as JSON
  astral call <method> [json]  Call a method on the running app (e.g. app.identify)
  astral --version             Print the CLI version
  astral --help                Show this help
EOF
}

case "${1:-}" in
  identify) identify ;;
  call)
    shift
    call "$@"
    ;;
  --version | -v) echo "$CLI_VERSION" ;;
  --help | -h | "") usage ;;
  *)
    echo "astral: unknown command: $1" >&2
    usage >&2
    exit 1
    ;;
esac
