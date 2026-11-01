import { getRendererMethods } from "../renderer-call";
import type { CliServer } from "../server";

const PROTOCOL_VERSION = 1;

export function registerSystemMethods(server: CliServer): void {
  server.register("system.ping", () => ({ pong: true }));
  server.register("system.capabilities", () => ({
    protocolVersion: PROTOCOL_VERSION,
    methods: [
      ...new Set([...server.listMethods(), ...getRendererMethods()]),
    ].sort(),
  }));
}
