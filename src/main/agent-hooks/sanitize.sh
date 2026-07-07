# POSIX shell helper: turn a JSON-extracted string value into an OSC-safe body.
# Unescapes common JSON escapes, drops control chars (they would terminate the
# OSC sequence), swaps the ';' field separator for ',' so it can't split the OSC
# payload, and caps the length.
sanitize_body() {
  # Collapse JSON's \\ (literal backslash) to a placeholder FIRST so the
  # following \n / \t / \" rules can't misread a Windows path like C:\\notes
  # (\\ + n) as the \n control escape.
  _sep=$(printf '\001')
  printf '%s' "$1" | sed \
    -e "s/\\\\\\\\/${_sep}/g" \
    -e 's/\\n/ /g' \
    -e 's/\\t/ /g' \
    -e 's/\\"/"/g' \
    -e "s/${_sep}/\\\\/g" \
    | tr -d '\000-\037' | tr ';' ',' | cut -c1-160
}
