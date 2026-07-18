# Emits OSC 777;notify;<title>;<body> from hook JSON on stdin.
# Body is pulled from the JSON field named $NOTIFY_FIELD (e.g. "message" or
# "question"); when that field is absent or empty, $NOTIFY_FALLBACK is used.

ptty=$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')
[ -n "$ptty" ] && [ "$ptty" != "?" ] || exit 0

in=$(cat)
# grep -oE keeps escaped quotes in the value (so quoted text isn't truncated);
# head -n 1 takes the first match (AskUserQuestion's tool_input has several).
raw=$(printf '%s' "$in" | grep -oE '"'"$NOTIFY_FIELD"'"[[:space:]]*:[[:space:]]*"([^"\]|\\.)*"' | head -n 1)
value=$(printf '%s' "$raw" | sed -E 's/^"'"$NOTIFY_FIELD"'"[[:space:]]*:[[:space:]]*"//; s/"$//')
body=$(sanitize_body "$value")
[ -n "$body" ] || body="$NOTIFY_FALLBACK"

printf '\033]777;notify;%s;%s\007' "$NOTIFY_TITLE" "$body" > "/dev/$ptty"
