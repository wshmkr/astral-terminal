# Surfaces

A surface is a tab in a pane: a terminal or a browser. These methods back the `astral tab` commands. All of them accept the [targeting fields](../cli-protocol.md#targeting-workspaces-panes-and-surfaces) unless noted otherwise.

When no target is given, a method acts on the caller's surface (`$ASTRAL_SURFACE_ID`), and otherwise on the focused pane of the active workspace.

## `surface.list`

Lists tabs without changing anything. With `paneId`, lists that pane's tabs. Otherwise lists the tabs of `workspaceId`, or of the caller's workspace. `surfaceId` is ignored.

- **Result:**

  ```json
  {
    "surfaces": [
      {
        "surfaceId": "...",
        "paneId": "...",
        "workspaceId": "...",
        "type": "terminal",
        "name": "...",
        "cwd": "...",
        "active": true
      },
      {
        "surfaceId": "...",
        "paneId": "...",
        "workspaceId": "...",
        "type": "browser",
        "name": "...",
        "url": "https://example.com",
        "active": false
      }
    ]
  }
  ```

  Terminals have `cwd` and browsers have `url`. `active` is whether the tab is the one showing in its pane.

## `surface.create`

Opens a new tab at the end of the target pane and makes it the pane's active tab. Keyboard focus does not move unless `focus` is set.

| Param     | Description                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `browser` | Open a browser tab instead of a terminal.                                                                                                                               |
| `url`     | The URL to open. Requires `browser`. Defaults to the configured homepage.                                                                                               |
| `cwd`     | The terminal's working directory. Not allowed with `browser`. Defaults to the working directory of the pane's active terminal.                                          |
| `focus`   | Make the target pane its workspace's focused pane. This does not switch workspaces, so a pane in a background workspace takes focus when you next switch to it.         |

- **Result:** `{ "workspaceId": "...", "paneId": "...", "surfaceId": "..." }`.

## `surface.focus`

Switches to the target tab, its pane, and its workspace.

- **Result:** `{ "surfaceId": "..." }`.

## `surface.close`

Closes the target tab and ends what is running in it. Closing a pane's last tab closes the pane, and closing a workspace's last tab closes the workspace.

- **Result:** `{ "surfaceId": "..." }`.

## `surface.rename`

Renames the target tab. A terminal program that sets its title can replace the name later.

- **Params:** `name`, which must not be blank, plus the targeting fields.
- **Result:** `{ "surfaceId": "..." }`.

## `surface.move`

Moves the target tab to another pane in the same workspace and makes it that pane's active tab. Focus does not move, unless the move closes the focused pane.

| Param      | Description                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `toPaneId` | The destination pane: an id or a unique id prefix. A pane in another workspace fails with `invalid_params`.                               |
| `index`    | The zero-based position in the destination pane. Defaults to last. When `toPaneId` is the tab's own pane, this reorders the tab in place. |

- **Result:** `{ "surfaceId": "...", "paneId": "..." }`, where `paneId` is the destination.

## Command line

| Command                                                            | Method           |
| ------------------------------------------------------------------ | ---------------- |
| `astral tab list [--pane <pane>] [--workspace <workspace>]`        | `surface.list`   |
| `astral tab new [--browser [--url <url>]] [--cwd <dir>] [--focus]` | `surface.create` |
| `astral tab focus [tab]`                                           | `surface.focus`  |
| `astral tab close [tab]`                                           | `surface.close`  |
| `astral tab rename [tab] <name>`                                   | `surface.rename` |
| `astral tab move [tab] --pane <pane> [--index <n>]`                | `surface.move`   |

`--workspace`, `--pane`, and `--tab` select the target, and a positional `tab` overrides `--tab`. On `tab move`, `--pane` is the destination rather than part of the target. `--tab` does not apply to `tab list`. Add `--json` to print the method's result.
