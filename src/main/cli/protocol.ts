export const CLI_ERROR_CODES = {
  parseError: "parse_error",
  badEnvelope: "bad_envelope",
  unknownMethod: "unknown_method",
  invalidParams: "invalid_params",
  internalError: "internal_error",
} as const;

export type CliErrorCode =
  (typeof CLI_ERROR_CODES)[keyof typeof CLI_ERROR_CODES];

export interface CliRequest {
  id: string | number;
  method: string;
  params?: unknown;
}

export interface CliOk {
  id: string | number;
  ok: true;
  result: unknown;
}

export interface CliErr {
  id: string | number | null;
  ok: false;
  error: { code: CliErrorCode; message: string };
}

export type CliReply = CliOk | CliErr;

export type ParseResult =
  | { ok: true; req: CliRequest }
  | {
      ok: false;
      id: string | number | null;
      code: CliErrorCode;
      message: string;
    };

export function parseRequest(line: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch (err) {
    return {
      ok: false,
      id: null,
      code: CLI_ERROR_CODES.parseError,
      message: err instanceof Error ? err.message : "invalid JSON",
    };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      id: null,
      code: CLI_ERROR_CODES.badEnvelope,
      message: "envelope must be a JSON object",
    };
  }
  const obj = raw as Record<string, unknown>;
  const rawId = obj.id;
  const idValid =
    typeof rawId === "string" ||
    (typeof rawId === "number" && Number.isFinite(rawId));
  if (!idValid) {
    return {
      ok: false,
      id: null,
      code: CLI_ERROR_CODES.badEnvelope,
      message: "id must be a string or finite number",
    };
  }
  const id = rawId as string | number;
  if (typeof obj.method !== "string" || obj.method.length === 0) {
    return {
      ok: false,
      id,
      code: CLI_ERROR_CODES.badEnvelope,
      message: "method must be a non-empty string",
    };
  }
  return {
    ok: true,
    req: { id, method: obj.method, params: obj.params },
  };
}

export function formatReply(reply: CliReply): string {
  return `${JSON.stringify(reply)}\n`;
}

export function makeOk(id: string | number, result: unknown): CliOk {
  return { id, ok: true, result };
}

export function makeErr(
  id: string | number | null,
  code: CliErrorCode,
  message: string,
): CliErr {
  return { id, ok: false, error: { code, message } };
}
