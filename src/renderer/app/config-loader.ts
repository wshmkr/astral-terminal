import { singleFlight } from "../../shared/single-flight";

// singleFlight never caches a rejection: that would permanently break every
// terminal created after one transient failure.
export const loadAppConfig = singleFlight(() => window.app.readConfig());
