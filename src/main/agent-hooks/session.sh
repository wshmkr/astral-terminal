# Emits OSC $AGENT_OSC;$AGENT_NAME;$AGENT_EVENT;<sid>;<cwd-b64> from hook JSON on stdin.

in=$(cat)
sid=$(printf '%s' "$in" | sed -nE 's/.*[^A-Za-z0-9_]"session_id"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -n 1)
cwd=$(printf '%s' "$in" | sed -nE 's/.*[^A-Za-z0-9_]"cwd"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -n 1)

[ -n "$sid" ] || exit 0
cwdb64=$(printf '%s' "$cwd" | base64 | tr -d '\n')
printf '\033]%s;%s;%s;%s;%s\007' \
  "$AGENT_OSC" "$AGENT_NAME" "$AGENT_EVENT" "$sid" "$cwdb64" > /dev/tty
