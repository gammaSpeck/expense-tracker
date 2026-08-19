import { pickEnum } from "@/lib/validation";

const ENVIRONMENTS = ["localhost", "staging", "production"] as const;

interface Config {
  env: (typeof ENVIRONMENTS)[number];
  gDrive: {
    clientId: string;
    clientSecret: string;
  };
  posthog: {
    key: string;
  };
  appVersion: string;
  buildTime: string;
}

export const config: Config = {
  env: pickEnum(import.meta.env.VITE_ENV, ENVIRONMENTS, "localhost"),
  gDrive: {
    clientId: import.meta.env.VITE_GOOGLE_CLOUD_DRIVE_OAUTH2_CLIENT_ID ?? "",
    clientSecret: import.meta.env.VITE_GOOGLE_CLOUD_DRIVE_OAUTH2_CLIENT_SECRET ?? "",
  },
  posthog: {
    key: import.meta.env.VITE_POSTHOG_KEY ?? "",
  },
  appVersion: __APP_VERSION__,
  buildTime: __BUILD_TIME__,
};
