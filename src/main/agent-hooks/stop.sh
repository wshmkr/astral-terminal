# Emits OSC 777;notify for the Stop hook, summarizing Claude's final message.
# Reads transcript_path from the hook JSON on stdin, pulls the text of the last
# (non-subagent) assistant turn, and falls back to $NOTIFY_FALLBACK.

ptty=$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')
[ -n "$ptty" ] && [ "$ptty" != "?" ] || exit 0

in=$(cat)
transcript=$(printf '%s' "$in" | sed -nE 's/.*[^A-Za-z0-9_]"transcript_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -n 1)

body=""
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  # Match "type":"assistant" / "isSidechain":true tolerantly — the transcript
  # is compact today, but relying on zero-whitespace serialization would silently
  # regress into fallback (or leak a subagent turn) the moment that drifts.
  # Then scope the text pull to a "text":"...","type":"text" block — the pair
  # is adjacent because transcript keys serialize alphabetically — so a tool_use
  # block whose input has a "text" field can't slip past the greedy match, and
  # accept \" inside the value so quoted content isn't truncated.
  raw=$(grep -E '"type"[[:space:]]*:[[:space:]]*"assistant"' "$transcript" 2>/dev/null \
    | grep -vE '"isSidechain"[[:space:]]*:[[:space:]]*true' \
    | tail -n 1 \
    | grep -oE '"text"[[:space:]]*:[[:space:]]*"([^"\]|\\.)*"[[:space:]]*,[[:space:]]*"type"[[:space:]]*:[[:space:]]*"text"' \
    | tail -n 1)
  value=$(printf '%s' "$raw" | sed -E 's/^"text"[[:space:]]*:[[:space:]]*"//; s/"[[:space:]]*,[[:space:]]*"type"[[:space:]]*:[[:space:]]*"text"$//')
  body=$(sanitize_body "$value")
fi
[ -n "$body" ] || body="$NOTIFY_FALLBACK"

printf '\033]777;notify;%s;%s\007' "$NOTIFY_TITLE" "$body" > "/dev/$ptty"
