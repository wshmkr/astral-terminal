import type { AppConfig } from "../../shared/types";

let cached: AppConfig | null = null;
let inflight: Promise<AppConfig> | null = null;

export function loadAppConfig(): Promise<AppConfig> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = window.app.readConfig().then(
    (config) => {
      cached = config;
      inflight = null;
      return config;
    },
    (err) => {
      // Don't cache the rejection: it would permanently break every terminal
      // created after one transient failure.
      inflight = null;
      throw err;
    },
  );
  return inflight;
}
