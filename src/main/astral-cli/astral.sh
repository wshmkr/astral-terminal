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
# second response line). Exit 3: sent but no reply, so it may have run and must not be retried on
# another host. Other non-zero: unreachable. The reply wait exceeds the app's 6s pane.split bound.
tcp_exchange() {
  if command -v bash >/dev/null 2>&1; then
    # a refused or timed-out candidate is expected, not an error
    {
      ASTRAL_H=$1 ASTRAL_P=$2 ASTRAL_AUTH=$3 ASTRAL_REQ=$4 bash -c '
      # bound the connect only; watchdog stays off stdout so it cannot hold the reply pipe open
      ( sleep 3; kill -TERM $$ ) >/dev/null &
      _wd=$!
      exec 3<>"/dev/tcp/$ASTRAL_H/$ASTRAL_P" || exit 1
      kill "$_wd"
      printf "%s\n%s\n" "$ASTRAL_AUTH" "$ASTRAL_REQ" >&3
      IFS= read -r -t 10 _discard <&3 || exit 3
      IFS= read -r -t 10 _reply <&3 || exit 3
      printf "%s\n" "$_reply"
    '
    } 2>/dev/null
    return $?
  fi
  _to=""
  command -v timeout >/dev/null 2>&1 && _to="timeout 10"
  if command -v nc >/dev/null 2>&1; then
    # nc won't close on stdin EOF without a half-close flag, and it differs by variant
    # (Ncat and busybox need none); derive it from the help text
    _nc_close=""
    case "$(nc -h 2>&1)" in
      *Ncat*) ;;
      *"Shutdown the network socket after EOF"*) _nc_close="-N" ;;
      *"quit after EOF"*) _nc_close="-q 0" ;;
    esac
    _out=$(printf '%s\n%s\n' "$3" "$4" | $_to nc $_nc_close "$1" "$2" 2>/dev/null)
    # an auth reply proves the request was sent
    [ -n "$_out" ] || return 1
    _reply=$(printf '%s\n' "$_out" | sed -n '2p')
    [ -n "$_reply" ] || return 3
    printf '%s\n' "$_reply"
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
    reply=$(tcp_exchange "$host" "$ASTRAL_PORT" "$auth" "$req")
    rc=$?
    if [ "$rc" -eq 3 ]; then
      echo "astral: no reply from Astral Terminal on $host:$ASTRAL_PORT (the request may have run)" >&2
      return 1
    fi
    [ "$rc" -eq 0 ] && [ -n "$reply" ] || continue
    cache=$(host_cache)
    # the port changes each launch, so clear prior runs' caches before recording this one
    rm -f "${cache%/*}"/astral-host-* 2>/dev/null || true
    printf '%s\n' "$host" >"$cache" 2>/dev/null || true
    printf '%s\n' "$reply"
    # exit non-zero on a non-ok reply (e.g. unauthorized) so it isn't mistaken for success
    case "$reply" in
      *'"ok":true'*) return 0 ;;
      *) return 1 ;;
    esac
  done
  echo "astral: could not reach Astral Terminal on port $ASTRAL_PORT" >&2
  return 1
}

# Split the pane holding this shell, or the focused pane when ASTRAL_SURFACE_ID is unset.
split() {
  if [ "$#" -ne 1 ] || [ -z "$1" ]; then
    echo "astral: usage: astral split <right|down>" >&2
    return 2
  fi
  direction=$1
  case "$direction" in
    right | down) ;;
    *)
      echo "astral: invalid direction: $direction (expected right or down)" >&2
      return 2
      ;;
  esac
  if [ -n "${ASTRAL_SURFACE_ID:-}" ]; then
    # interpolated unescaped into the JSON params
    case "$ASTRAL_SURFACE_ID" in
      *[!A-Za-z0-9._:-]*)
        echo "astral: invalid ASTRAL_SURFACE_ID: $ASTRAL_SURFACE_ID" >&2
        return 2
        ;;
    esac
    params=$(printf '{"direction":"%s","surfaceId":"%s"}' \
      "$direction" "$ASTRAL_SURFACE_ID")
  else
    params=$(printf '{"direction":"%s"}' "$direction")
  fi
  call pane.split "$params"
}

usage() {
  cat <<EOF
Astral Terminal CLI v$CLI_VERSION

Usage:
  astral identify              Print this surface's identity as JSON
  astral split <right|down>    Split the current pane right or down
  astral call <method> [json]  Call a method on the running app (e.g. app.identify)
  astral --version             Print the CLI version
  astral --help                Show this help
EOF
}

case "${1:-}" in
  identify) identify ;;
  split)
    shift
    split "$@"
    ;;
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
