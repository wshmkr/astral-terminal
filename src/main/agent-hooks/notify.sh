# Emits OSC 777;notify;<title>;<body> from hook JSON on stdin.
# Body is pulled from the JSON field named $NOTIFY_FIELD (e.g. "message" or
# "question"); when that field is absent or empty, $NOTIFY_FALLBACK is used.

ptty=$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')
[ -n "$ptty" ] && [ "$ptty" != "?" ] || exit 0

in=$(cat)
# grep -oE accepts \" inside the value (so quoted text isn't truncated) and
# head -n 1 picks the FIRST occurrence — matters for AskUserQuestion, whose
# tool_input has a "questions" array with more than one "question" entry.
raw=$(printf '%s' "$in" | grep -oE '"'"$NOTIFY_FIELD"'"[[:space:]]*:[[:space:]]*"([^"\]|\\.)*"' | head -n 1)
value=$(printf '%s' "$raw" | sed -E 's/^"'"$NOTIFY_FIELD"'"[[:space:]]*:[[:space:]]*"//; s/"$//')
body=$(sanitize_body "$value")
[ -n "$body" ] || body="$NOTIFY_FALLBACK"

printf '\033]777;notify;%s;%s\007' "$NOTIFY_TITLE" "$body" > "/dev/$ptty"
