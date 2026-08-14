interface Config {
  env: "localhost" | "staging" | "production";
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
  env: import.meta.env.VITE_ENV ?? "localhost",
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
