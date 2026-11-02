import type { TerminalController } from "./terminal-lifecycle";

const controllers = new Map<string, TerminalController>();

export function registerTerminalController(
  surfaceId: string,
  controller: TerminalController,
): void {
  controllers.set(surfaceId, controller);
}

export function unregisterTerminalController(
  surfaceId: string,
  controller: TerminalController,
): void {
  if (controllers.get(surfaceId) === controller) controllers.delete(surfaceId);
}

export function getTerminalController(
  surfaceId: string,
): TerminalController | undefined {
  return controllers.get(surfaceId);
}
