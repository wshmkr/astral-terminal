const MAX_SURFACE_ID_LEN = 128;
const SURFACE_ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

export function isValidSurfaceId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= MAX_SURFACE_ID_LEN &&
    SURFACE_ID_PATTERN.test(id)
  );
}
