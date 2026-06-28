# Emits OSC 777;notify;<title>;<body> from hook JSON on stdin.
# Body is pulled from the JSON field named $NOTIFY_FIELD (e.g. "message" or
# "question"); when that field is absent or empty, $NOTIFY_FALLBACK is used.

ptty=$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')
[ -n "$ptty" ] && [ "$ptty" != "?" ] || exit 0

in=$(cat)
body=$(printf '%s' "$in" | sed -nE "s/.*[^A-Za-z0-9_]\"$NOTIFY_FIELD\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\\1/p" | head -n 1)
# Unescape the common JSON escapes, drop control chars (they would terminate the
# OSC sequence), swap the ';' field separator for ',', and cap the length.
body=$(printf '%s' "$body" | sed -E 's/\\n/ /g; s/\\t/ /g; s/\\"/"/g' | tr -d '\000-\037' | tr ';' ',' | cut -c1-160)
[ -n "$body" ] || body="$NOTIFY_FALLBACK"

printf '\033]777;notify;%s;%s\007' "$NOTIFY_TITLE" "$body" > "/dev/$ptty"
