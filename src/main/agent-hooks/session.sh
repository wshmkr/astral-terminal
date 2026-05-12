# Emits OSC $AGENT_OSC;$AGENT_NAME;$AGENT_EVENT;<sid>;<cwd-b64> from hook JSON on stdin.

# Claude Code spawns hooks via setsid, so /dev/tty is unopenable here.
# Resolve the parent's tty (claude) and write to that path instead
ptty=$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')
[ -n "$ptty" ] && [ "$ptty" != "?" ] || exit 0

in=$(cat)
sid=$(printf '%s' "$in" | sed -nE 's/.*[^A-Za-z0-9_]"session_id"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -n 1)
cwd=$(printf '%s' "$in" | sed -nE 's/.*[^A-Za-z0-9_]"cwd"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -n 1)

[ -n "$sid" ] || exit 0
cwdb64=$(printf '%s' "$cwd" | base64 | tr -d '\n')
printf '\033]%s;%s;%s;%s;%s\007' \
  "$AGENT_OSC" "$AGENT_NAME" "$AGENT_EVENT" "$sid" "$cwdb64" > "/dev/$ptty"
