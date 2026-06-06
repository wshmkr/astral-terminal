# Astral CLI protocol (PR 1)

The main process exposes a local JSON socket that accepts newline-delimited request envelopes and replies with newline-delimited response envelopes. This document covers the wire protocol and the one method shipped in PR 1; later PRs add more methods on the same transport.

## Socket location

- **Linux / macOS:**
  - `$XDG_RUNTIME_DIR/astral/<pid>.sock` when `XDG_RUNTIME_DIR` is set and writable; the directory is created with mode `0700`, the socket with mode `0600`.
  - Fallback: `${TMPDIR:-/tmp}/astral-<uid>-<pid>.sock`.
- **Windows:** `\\.\pipe\astral-<pid>`.

The socket is opened during `app.whenReady()` and closed in `before-quit`; a `process.on("exit")` hook removes it as a fallback if that cleanup is cut short. Neither runs on `SIGKILL`, a segfault, or power loss, so a socket orphaned by one of those persists until removed manually — the per-pid name means a fresh launch binds a different path and won't reclaim it.

## Envelope shape

Request (client → server), one JSON object per line:

```json
{ "id": "1", "method": "app.identify", "params": null }
```

- `id` — string or finite number. Echoed back on the reply.
- `method` — non-empty string, namespaced as `namespace.action`.
- `params` — optional; method-specific.

Successful reply:

```json
{ "id": "1", "ok": true, "result": { ... } }
```

Error reply:

```json
{ "id": "1", "ok": false, "error": { "code": "...", "message": "..." } }
```

`id` is `null` on errors raised before the id could be parsed (`parse_error`, malformed-envelope cases).

### Error codes

| Code             | Meaning                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `parse_error`    | Line was not valid JSON.                                             |
| `bad_envelope`   | JSON did not match the envelope shape, or line exceeded 1 MiB.       |
| `unknown_method` | `method` is not registered.                                          |
| `invalid_params` | Handler rejected the params.                                         |
| `internal_error` | Handler threw something other than a `CliMethodError`.               |

Lines may not exceed 1 MiB. Empty lines are ignored. Parse / envelope errors do not close the connection; oversize lines do.

## Methods

### `app.identify`

Returns information about the running app instance and the currently active workspace / pane / surface.

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

  `active` is `null` until the renderer pushes its first snapshot (briefly during startup, or if no window has opened yet).

## Smoke test

1. `npm run dev`. Main-process log shows `[cli] listening on <socket path>`.
2. `ls -la $XDG_RUNTIME_DIR/astral/` — socket appears with mode `srw-------`.
3. Round-trip `app.identify`:

   ```sh
   printf '{"id":"1","method":"app.identify"}\n' \
     | nc -U "$XDG_RUNTIME_DIR/astral/$(pgrep -n astral).sock"
   ```

   Expect one line of JSON with `"ok":true` and a populated `result.active`.
4. Switch workspaces in the UI, repeat step 3 — `active.workspaceId` changes.
5. Malformed input keeps the connection open:

   ```sh
   printf 'not json\n' | nc -U "<socket>"
   ```

   Expect `{"id":null,"ok":false,"error":{"code":"parse_error",...}}`.
6. Unknown method:

   ```sh
   printf '{"id":"2","method":"does.not.exist"}\n' | nc -U "<socket>"
   ```

   Expect `unknown_method`.
7. Quit via the app menu — socket file is removed.
8. Simulate a stale socket: `kill -9` the app, `touch` the previous socket path, relaunch — `start()` unlinks the leftover and binds cleanly.
