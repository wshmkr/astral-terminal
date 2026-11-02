# Workspace methods

Methods for listing and managing workspaces over the [Astral CLI socket](../cli-protocol.md). "Target params" are the targeting fields described there; these methods only use `workspaceId` and `callerSurfaceId`, and fall back to the active workspace when neither names one.

Errors common to all methods: `invalid_params` when a param has the wrong type or fails validation, and, for methods that take target params, `not_found` or `ambiguous` when `workspaceId` matches nothing or more than one workspace.

## `workspace.list`

Lists every workspace in sidebar order.

- **CLI:** `astral workspace list`, and `astral tree` with `layout: true`.
- **Params:** `layout` (optional boolean): include each workspace's pane tree.
- **Result:**

  ```json
  {
    "workspaces": [
      {
        "id": "...",
        "index": 1,
        "name": "Workspace 1",
        "active": true,
        "paneCount": 2,
        "tabCount": 3,
        "layout": { "...": "only with layout: true" }
      }
    ]
  }
  ```

  `index` is the 1-based sidebar position. `active` is true for the workspace shown in the window.

  `layout` is a tree of two kinds of node. A split:

  ```json
  { "splitId": "...", "direction": "vertical", "sizes": [0.5, 0.5], "children": [] }
  ```

  `direction` is `vertical` for side-by-side children and `horizontal` for stacked children. `sizes` is omitted until a split has been resized.

  A pane:

  ```json
  {
    "paneId": "...",
    "focused": true,
    "tabs": [
      { "surfaceId": "...", "type": "terminal", "name": "~", "cwd": "~/dev", "active": true },
      { "surfaceId": "...", "type": "browser", "name": "Docs", "url": "https://example.com", "active": false }
    ]
  }
  ```

  `focused` marks the pane focused within its workspace; in a background workspace, that is the pane that regains focus on switching to it. `cwd` is present on terminals and `url` on browsers. `active` marks the tab shown in its pane.

- **Errors:** the common ones.

## `workspace.current`

Resolves target params to a workspace without changing anything.

- **CLI:** `astral workspace current`.
- **Params:** target params.
- **Result:** `{ "id": "...", "index": 1, "name": "Workspace 1", "active": true }`
- **Errors:** the common ones. Also `not_found` when no workspace is open.

## `workspace.create`

Creates a workspace with one terminal. Without `focus`, the active workspace and focused pane do not change, unless no workspace is active, in which case the new one becomes active.

- **CLI:** `astral workspace new [<name>] [--cwd <dir>] [--focus]`. The CLI makes a relative `--cwd` absolute against its own working directory.
- **Params:**
  - `name` (optional string): normalized as described under [`workspace.rename`](#workspacerename). Defaults to the next free `Workspace <n>`.
  - `cwd` (optional string): the terminal's working directory. Defaults to `~`.
  - `focus` (optional boolean): switch to the new workspace.
- **Result:** `{ "workspaceId": "...", "paneId": "...", "surfaceId": "..." }`
- **Errors:** `invalid_params`, including a `name` that is empty after normalization.

## `workspace.select`

Switches to a workspace. Its previously focused pane regains focus.

- **CLI:** `astral workspace select <workspace>`, or `--workspace <workspace>` in place of the argument. The CLI requires one of them; the method itself accepts target params with no `workspaceId`.
- **Params:** target params.
- **Result:** `{ "workspaceId": "..." }`
- **Errors:** the common ones. Also `not_found` when no workspace is open.

## `workspace.rename`

Renames a workspace.

- **CLI:** `astral workspace rename [<workspace>] <name>`. Defaults to the caller's workspace.
- **Params:** `name` (string) plus target params. The name is trimmed, runs of whitespace collapse to one space, and it is cut to 64 characters.
- **Result:** `{ "workspaceId": "..." }`
- **Errors:** the common ones, including `invalid_params` for a `name` that is empty after normalization. Also `not_found` when no workspace is open.

## `workspace.close`

Closes a workspace and all of its terminals. Closing the active workspace activates the one before it in the sidebar, or the first if there is none before it. Closing the last workspace leaves the app open with no workspaces, the same as closing it in the sidebar. Closing the caller's own workspace also ends the caller's shell, so the command may not get to print its result.

- **CLI:** `astral workspace close [<workspace>]`. Defaults to the caller's workspace.
- **Params:** target params.
- **Result:** `{ "workspaceId": "..." }`, the workspace that was closed.
- **Errors:** the common ones. Also `not_found` when no workspace is open.

## `workspace.reorder`

Moves a workspace to a new sidebar position, shifting the workspaces between its old and new positions.

- **CLI:** `astral workspace move [<workspace>] <index>`. Defaults to the caller's workspace.
- **Params:** `index` (integer, 1 or greater): the 1-based position to move to, plus target params.
- **Result:** `{ "workspaceId": "..." }`
- **Errors:** the common ones. Also `not_found` when `index` is past the last workspace or no workspace is open.
