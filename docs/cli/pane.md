# Panes

Commands and socket methods for listing, splitting, focusing, closing, and resizing panes. See [the socket reference](../cli-protocol.md) for the request format, errors, and the targeting fields (`workspaceId`, `paneId`, `surfaceId`, `callerSurfaceId`).

Commands that act on a pane target, in order: the pane given as an argument or by `--pane`, `--tab`, or `--workspace`; the pane the command runs in; the focused pane of the active workspace.

## Commands

| Command                                      | Description                                  |
| -------------------------------------------- | -------------------------------------------- |
| `astral pane list`                           | List the panes in a workspace.               |
| `astral pane split <left\|right\|up\|down>`  | Split a pane. `astral split` is an alias.    |
| `astral pane focus [pane]`                   | Focus a pane, switching workspace if needed. |
| `astral pane close [pane]`                   | Close a pane.                                |
| `astral pane resize [pane] --size <percent>` | Set a pane's share of its parent split.      |

`split` accepts these flags:

| Flag        | Description                                               |
| ----------- | --------------------------------------------------------- |
| `--browser` | Open a browser tab in the new pane instead of a terminal. |
| `--url`     | The URL for the browser tab. Requires `--browser`.        |
| `--focus`   | Focus the new pane, switching workspace if needed.        |

Add `--json` to any command to print the method's result as JSON.

```sh
astral split left
astral pane split down --browser --url https://example.com --focus
astral pane resize --size 30
astral pane close
```

## Methods

### `pane.list`

Lists the panes of one workspace. Without `workspaceId`, that is the workspace the caller runs in, or else the active workspace.

- **Params:** `workspaceId` and `callerSurfaceId`, both optional.
- **Result:**

  ```json
  {
    "panes": [
      {
        "paneId": "...",
        "workspaceId": "...",
        "focused": true,
        "activeSurfaceId": "...",
        "tabCount": 2
      }
    ]
  }
  ```

  In a background workspace, `focused` marks the pane that regains focus when you switch to it.

### `pane.split`

Splits a pane and opens a new tab in the new pane.

- **Params:** the targeting fields plus:

  | Field       | Required | Description                                                                          |
  | ----------- | -------- | ------------------------------------------------------------------------------------ |
  | `direction` | yes      | Where the new pane goes relative to the target: `left`, `right`, `up`, or `down`.    |
  | `browser`   | no       | `true` opens a browser tab instead of a terminal.                                    |
  | `url`       | no       | The URL for the browser tab. Fails with `invalid_params` unless `browser` is `true`. |
  | `focus`     | no       | `true` focuses the new pane and switches to its workspace.                           |

  Without `focus`, the new pane takes focus only when the split pane was focused. A browser tab with no `url` opens the homepage from settings.

- **Result:** `{ "workspaceId": "...", "paneId": "...", "surfaceId": "..." }` for the new pane and its tab.

### `pane.focus`

Focuses a pane, switching to its workspace first if needed.

- **Params:** the targeting fields.
- **Result:** `{ "paneId": "..." }`

### `pane.close`

Closes a pane and every tab in it. Closing the last pane of a workspace closes the workspace.

- **Params:** the targeting fields.
- **Result:** `{ "paneId": "..." }`

### `pane.resize`

Sets a pane's share of its parent split, along the split's own axis. Other panes in the split are scaled to keep their proportions to each other. A pane with no parent split fails with `invalid_params`.

- **Params:** the targeting fields plus `size`, a percentage from 5 to 95.
- **Result:** `{ "paneId": "...", "sizes": [0.3, 0.7] }`. `sizes` holds a fraction for each child of the split, in order, and sums to 1.
