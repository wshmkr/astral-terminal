import { singleFlight } from "../../shared/single-flight";

export const loadAppConfig = singleFlight(() => window.app.readConfig());
