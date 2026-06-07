import { z } from "zod";

export const CLI_ERROR_CODES = {
  parseError: "parse_error",
  badEnvelope: "bad_envelope",
  unauthorized: "unauthorized",
  unknownMethod: "unknown_method",
  invalidParams: "invalid_params",
  internalError: "internal_error",
} as const;

export type CliErrorCode =
  (typeof CLI_ERROR_CODES)[keyof typeof CLI_ERROR_CODES];

const CliIdSchema = z.union([z.string(), z.number().finite()], {
  error: "id must be a string or finite number",
});

const CliRequestSchema = z.object({
  id: CliIdSchema,
  method: z.string().min(1, "method must be a non-empty string"),
  params: z.unknown().optional(),
});

export type CliRequest = z.infer<typeof CliRequestSchema>;

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
  const result = CliRequestSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, req: result.data };
  }
  return {
    ok: false,
    id: recoverId(raw),
    code: CLI_ERROR_CODES.badEnvelope,
    message: result.error.issues[0]?.message ?? "invalid envelope",
  };
}

function recoverId(raw: unknown): string | number | null {
  if (typeof raw !== "object" || raw === null) return null;
  const parsed = CliIdSchema.safeParse((raw as Record<string, unknown>).id);
  return parsed.success ? parsed.data : null;
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
