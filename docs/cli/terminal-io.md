# Terminal input and output

These commands send input to a terminal tab and read what it displays. They target the tab chosen by `--tab`, `--pane`, or `--workspace`, and otherwise the tab the command runs in. See [Targeting](../cli-protocol.md#targeting-workspaces-panes-and-surfaces).

A target that is not a terminal fails with `unsupported_surface`. A terminal tab with no running process fails with `not_found`.

## Commands

### `astral tab send <text|->`

Sends text to the terminal. `-` reads the text from stdin. The text is written byte for byte and never passes through a shell, so newlines, tabs, and escape sequences reach the terminal unchanged. A trailing newline in stdin is sent too.

| Flag      | Description                                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--enter` | Sends a carriage return after the text.                                                                                                        |
| `--paste` | Wraps the text in `ESC[200~` and `ESC[201~` when the terminal has bracketed paste on. With `--enter`, the carriage return follows the wrapper. |

```sh
astral tab send --tab 3f2a 'make test' --enter
git diff | astral tab send --tab 3f2a --paste -
```

Use `--` before text that starts with a dash: `astral tab send -- --help`. To send a literal `-`, pipe it: `printf %s - | astral tab send -`.

The text must be valid UTF-8, and the whole request must fit the socket's 1 MiB line limit. `--paste` does not filter the text, so text containing `ESC[201~` ends the paste early.

On success the command prints nothing. With `--json` it prints the method's result.

### `astral tab send-key <key>...`

Sends named keys in order. All names are checked before anything is sent, and an unknown name is a usage error.

| Key                                                         | Sent as                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `enter`, `tab`, `escape`, `backspace`, `delete`             | `\r`, `\t`, `ESC`, `\x7f`, `ESC[3~`                                                     |
| `up`, `down`, `right`, `left`, `home`, `end`                | `ESC[A`, `B`, `C`, `D`, `H`, `F`; `ESC O` in place of `ESC[` in application cursor mode |
| `pageup`, `pagedown`                                        | `ESC[5~`, `ESC[6~`                                                                      |
| `f1`–`f12`                                                  | The standard xterm sequences                                                            |
| `ctrl-a`–`ctrl-z`                                           | The control byte, `\x01`–`\x1a`                                                         |
| `alt-<char>`, for any printable ASCII character but a space | `ESC` followed by the character                                                         |

```sh
astral tab send-key --tab 3f2a up enter
astral tab send-key --tab 3f2a ctrl-c
```

On success the command prints nothing. With `--json` it prints the method's result.

### `astral tab read`

Prints the terminal's text exactly as the app returns it, with no newline added. By default that is the visible screen.

| Flag           | Description                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------- |
| `--scrollback` | Prints the scrollback as well as the screen.                                                |
| `--lines N`    | Prints only the last `N` lines, looking back through the scrollback. `N` must be positive. |
| `--ansi`       | Prints colors and styles as escape sequences.                                               |

Each row of the terminal becomes one line, so a long line that wraps comes back as several. Trailing blank lines are removed. A read waits for a restored buffer and for output already received to be parsed.

With `--ansi` the output comes from the terminal's serializer: it keeps styling and cursor movement, and blank rows are not removed. When a full-screen program such as `less` is running, it holds the normal screen, then `ESC[?1049h`, then the program's whole screen; `--lines` and `--scrollback` apply only to the normal screen.

```sh
astral tab read --tab 3f2a --lines 5
```

### `astral tab clear-history [<tab>]`

Clears the screen and scrollback in both the visible terminal and what `tab read` returns. The line holding the cursor stays and moves to the top. A positional tab takes precedence over `--tab`.

While a full-screen program such as `less` is running, only its screen is cleared, and the normal screen's scrollback stays. Nothing is cleared when the cursor is on the first row and there is no scrollback.

On success the command prints nothing. With `--json` it prints the method's result.

## Methods

All of these accept the [targeting fields](../cli-protocol.md#targeting-workspaces-panes-and-surfaces).

### `surface.sendText`

- **Params:** `text` (string), and `paste` (boolean, optional).
- **Result:** `{ "surfaceId": "...", "bytes": 12 }`. `bytes` counts the UTF-8 bytes written, including any paste wrapper.

### `surface.sendKey`

- **Params:** `keys`, a non-empty array of the key names above. An unknown name fails with `invalid_params` and nothing is sent.
- **Result:** `{ "surfaceId": "..." }`

### `surface.read`

- **Params:** `scrollback` (boolean), `lines` (positive integer), and `ansi` (boolean), all optional. `lines` takes precedence over `scrollback`.
- **Result:** `{ "surfaceId": "...", "text": "..." }`

### `surface.clearHistory`

- **Params:** only the targeting fields.
- **Result:** `{ "surfaceId": "..." }`

### `surface.clearHistoryView`

Clears only the visible terminal, and succeeds when the surface has no terminal view. `surface.clearHistory` calls it; use that instead.

- **Params:** `surfaceId`, a full surface id.
- **Result:** `{ "surfaceId": "..." }`
