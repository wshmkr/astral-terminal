# Emits OSC $AGENT_OSC;$AGENT_NAME;$AGENT_EVENT;<sid>;<cwd-b64> from hook JSON on stdin.

ptty=$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')
[ -n "$ptty" ] && [ "$ptty" != "?" ] || exit 0

in=$(cat)
# grep -o + head -1 takes the FIRST occurrence: the top-level fields precede
# tool_input/tool_response, whose nested "cwd"/"session_id" keys must not win
# (a greedy sed .* would match the last occurrence on the line).
sid=$(printf '%s' "$in" | grep -oE '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n 1 | sed -E 's/^"session_id"[[:space:]]*:[[:space:]]*"//; s/"$//')
cwd=$(printf '%s' "$in" | grep -oE '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n 1 | sed -E 's/^"cwd"[[:space:]]*:[[:space:]]*"//; s/"$//')

[ -n "$sid" ] || exit 0
cwdb64=$(printf '%s' "$cwd" | base64 | tr -d '\n')
printf '\033]%s;%s;%s;%s;%s\007' \
  "$AGENT_OSC" "$AGENT_NAME" "$AGENT_EVENT" "$sid" "$cwdb64" > "/dev/$ptty"
