import { parseCliParams, registerCliHandler } from "../cli-bridge";
import { resolveTarget, TargetParamsSchema } from "./target";

registerCliHandler("surface.resolve", (params) =>
  resolveTarget(parseCliParams(TargetParamsSchema, params), "surface"),
);
