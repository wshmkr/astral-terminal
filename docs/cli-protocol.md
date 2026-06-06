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

## Available methods

### `app.identify`

Returns information about the running app and the workspace, pane, and surface that are currently active.

- **Params:** none.
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
    }
  }
  ```

  `active` is `null` until a window has opened and reported its state (briefly during startup).

## Errors

| Code             | Meaning                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `parse_error`    | The line was not valid JSON.                                                  |
| `bad_envelope`   | The JSON did not match the request shape (missing or invalid `id`/`method`).  |
| `unknown_method` | The `method` is not recognized.                                               |
| `invalid_params` | The method rejected the supplied `params`.                                    |
| `internal_error` | The method failed unexpectedly.                                               |

A malformed request is answered with an error and the connection stays open, so you can keep sending requests on it. A line that exceeds 1 MiB is rejected and the connection is closed.

## Example

Round-trip `app.identify` with `nc`:

```sh
sock="$XDG_RUNTIME_DIR/astral/$(pgrep -n astral).sock"
printf '{"id":"1","method":"app.identify"}\n' | nc -U "$sock"
```

Expect a single line of JSON with `"ok": true` and the active workspace, pane, and surface under `result.active`. Switch workspaces in the app and run it again to see `active.workspaceId` change.
