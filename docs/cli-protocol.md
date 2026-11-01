# Astral CLI socket

Astral Terminal runs a small local socket that lets scripts and other programs query the running app. You send it one JSON request per line and it sends back one JSON reply per line. This is the interface the `astral` command-line tool will build on; until that ships you can talk to the socket directly.

The socket is local to your machine and reachable only by your own user account.

## Finding the socket

Only one instance of Astral Terminal runs at a time, so there is at most one socket. It is named after the running process's id:

- **Linux / macOS:** `$XDG_RUNTIME_DIR/astral/<pid>.sock`, or `${TMPDIR:-/tmp}/astral-<uid>-<pid>.sock` when `XDG_RUNTIME_DIR` is not set.
- **Windows:** the named pipe `\\.\pipe\astral-<pid>`.

On Linux / macOS you can resolve the running instance's socket with:

```sh
sock="$XDG_RUNTIME_DIR/astral/$(pgrep -n astral).sock"
```

## Sending a request

Write one JSON object per line. Each request has these fields:

| Field    | Required | Description                                                                                  |
| -------- | -------- | -------------------------------------------------------------------------------------------- |
| `id`     | yes      | A string or number you choose. It is echoed back on the reply so you can match the two up.   |
| `method` | yes      | The method to call, e.g. `app.identify`.                                                     |
| `params` | no       | Method-specific arguments. Omit it, or send `null`, when a method takes none.                |

```json
{ "id": "1", "method": "app.identify", "params": null }
```

The reply is either a success:

```json
{ "id": "1", "ok": true, "result": { ... } }
```

or an error:

```json
{ "id": "1", "ok": false, "error": { "code": "...", "message": "..." } }
```

The `id` you sent is echoed back; on an error too malformed to read an `id`, it comes back as `null`. Request lines must not exceed 1 MiB.

## Targeting workspaces, panes, and surfaces

Methods that act on a workspace, pane, or surface accept these optional params:

| Field             | Description                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `workspaceId`     | A workspace id, a unique id prefix, or a 1-based index (as a number or a string such as `"2"`) in sidebar order. |
| `paneId`          | A pane id or a unique id prefix.                                                                                 |
| `surfaceId`       | A surface id or a unique id prefix.                                                                              |
| `callerSurfaceId` | The full id of the surface the caller runs in, available to shells as `$ASTRAL_SURFACE_ID`.                      |

Id prefixes must be at least 4 characters. A prefix that matches more than one item fails with `ambiguous`; an id, prefix, or index that matches nothing fails with `not_found`.

The target is chosen in this order:

1. Explicit `workspaceId`, `paneId`, and `surfaceId`. When several are given they must agree; otherwise the request fails with `invalid_params`. A pane resolves to its active surface, and a workspace to its focused pane.
2. `callerSurfaceId`, when it names a surface that still exists.
3. The focused pane of the active workspace.

## Available methods

### `app.identify`

Returns information about the running app, the workspace, pane, and surface that are currently active, and the caller's own location.

- **Params:** none, or `{ "callerSurfaceId": "..." }`.
- **Result:**

  ```json
  {
    "pid": 12345,
    "name": "Astral Terminal",
    "version": "0.5.0",
    "platform": "linux",
    "socketPath": "/run/user/1000/astral/12345.sock",
    "active": {
      "workspaceId": "...",
      "paneId": "...",
      "surfaceId": "...",
      "updatedAt": 1716285600000
    },
    "caller": {
      "workspaceId": "...",
      "paneId": "...",
      "surfaceId": "..."
    }
  }
  ```

  `active` is `null` until a window has opened and reported its state (briefly during startup). `caller` is `null` when `callerSurfaceId` is omitted or does not name an open surface.

### `system.ping`

Checks that the app is responding.

- **Params:** none.
- **Result:** `{ "pong": true }`

### `system.capabilities`

Lists the protocol version and every method the running app accepts.

- **Params:** none.
- **Result:**

  ```json
  { "protocolVersion": 1, "methods": ["app.identify", "pane.split", "..."] }
  ```

### `surface.resolve`

Resolves target params to a concrete surface without changing anything.

- **Params:** the targeting fields above.
- **Result:** `{ "workspaceId": "...", "paneId": "...", "surfaceId": "...", "surfaceType": "terminal" }`. `surfaceType` is `terminal` or `browser`.

### `pane.split`

Splits a pane and opens a new terminal in the new pane. The new pane takes focus only when the split pane was focused.

- **Params:** `direction` (`right` or `down`) plus the targeting fields above.
- **Result:** `{ "workspaceId": "...", "paneId": "...", "surfaceId": "..." }` for the new pane and its terminal.

## Method reference

- [Workspaces](cli/workspace.md)
- [Panes](cli/pane.md)
- [Surfaces](cli/surface.md)
- [Terminal input and output](cli/terminal-io.md)

## Errors

| Code                  | Meaning                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `parse_error`         | The line was not valid JSON.                                                 |
| `bad_envelope`        | The JSON did not match the request shape (missing or invalid `id`/`method`). |
| `unknown_method`      | The `method` is not recognized.                                              |
| `invalid_params`      | The method rejected the supplied `params`, or explicit target ids disagree.  |
| `not_found`           | A workspace, pane, or surface id, prefix, or index matched nothing.          |
| `ambiguous`           | An id prefix matched more than one workspace, pane, or surface.              |
| `unsupported_surface` | The method does not apply to the target surface's type.                      |
| `internal_error`      | The method failed unexpectedly.                                              |

A malformed request is answered with an error and the connection stays open, so you can keep sending requests on it. A line that exceeds 1 MiB is rejected and the connection is closed.

## Example

Round-trip `app.identify` with `nc`:

```sh
sock="$XDG_RUNTIME_DIR/astral/$(pgrep -n astral).sock"
printf '{"id":"1","method":"app.identify"}\n' | nc -U "$sock"
```

Expect a single line of JSON with `"ok": true` and the active workspace, pane, and surface under `result.active`. Switch workspaces in the app and run it again to see `active.workspaceId` change.
