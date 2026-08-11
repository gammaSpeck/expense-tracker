export type EnvName = "local" | "staging" | "production";

const ENVS: Record<EnvName, string> = {
  local: "http://localhost:4173",
  staging: "https://staging--gamma-expense-tracker.netlify.app",
  production: "https://extrack.madhukm.com",
};

export const E2E_ENV = (process.env.E2E_ENV ?? "local") as EnvName;
if (!(E2E_ENV in ENVS)) {
  throw new Error(`E2E_ENV must be one of: ${Object.keys(ENVS).join(", ")}`);
}

export const BASE_URL = process.env.E2E_BASE_URL ?? ENVS[E2E_ENV];
export const isDeployed = E2E_ENV !== "local";
/** Only spin up `vite preview` when targeting the built-in local URL. */
export const IS_LOCAL_SERVER = E2E_ENV === "local" && !process.env.E2E_BASE_URL;
