import type { z } from "zod";

export function formatParamsError(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.join(".");
  const message = issue?.message ?? "invalid params";
  return path ? `${path}: ${message}` : message;
}
