# Emits OSC 777;notify for the Stop hook, summarizing Claude's final message.
# Reads transcript_path from the hook JSON on stdin, pulls the text of the last
# (non-subagent) assistant turn, and falls back to $NOTIFY_FALLBACK.

ptty=$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')
[ -n "$ptty" ] && [ "$ptty" != "?" ] || exit 0

in=$(cat)
transcript=$(printf '%s' "$in" | sed -nE 's/.*[^A-Za-z0-9_]"transcript_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -n 1)

body=""
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  # Transcript is JSONL (one entry per line). Take the last main-agent assistant
  # entry and extract its text block. Keys are alphabetically sorted, so match
  # the "text" key directly rather than assuming it follows "type":"text".
  body=$(grep '"type":"assistant"' "$transcript" 2>/dev/null | grep -v '"isSidechain":true' | tail -n 1 \
    | sed -nE 's/.*"text"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' \
    | sed -E 's/\\n/ /g; s/\\t/ /g; s/\\"/"/g' | tr -d '\000-\037' | tr ';' ',' | cut -c1-160)
fi
[ -n "$body" ] || body="$NOTIFY_FALLBACK"

printf '\033]777;notify;%s;%s\007' "$NOTIFY_TITLE" "$body" > "/dev/$ptty"
