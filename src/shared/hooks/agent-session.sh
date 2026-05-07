# Reads a hook event JSON from stdin, extracts session_id and cwd,
# emits an OSC sequence carrying both back to the host terminal.
#
# Inputs (env): AGENT_OSC, AGENT_NAME, AGENT_EVENT
# Assumes session_id and cwd are emitted at the top level of the JSON.

in=$(cat)
sid=$(printf '%s' "$in" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
cwd=$(printf '%s' "$in" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)

[ -n "$sid" ] || exit 0
cwdb64=$(printf '%s' "$cwd" | base64 | tr -d '\n')
printf '\033]%s;%s;%s;%s;%s\007' \
  "$AGENT_OSC" "$AGENT_NAME" "$AGENT_EVENT" "$sid" "$cwdb64" > /dev/tty
