import posthog from "posthog-js";
import { config } from "@/config";
import { MAX_TELEMETRY_MESSAGE_LENGTH } from "@/config";

const enabled = config.posthog.key.length > 0;

if (enabled) {
  posthog.init(config.posthog.key, {
    api_host: "/xtk", // same-origin proxy; matches the _redirects path
    ui_host: "https://us.posthog.com",
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
  });
}

// Counts and error strings only — never descriptions, amounts, tags, category
// names, the passphrase, Drive tokens, or the account email.
export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!enabled) return;
  posthog.capture(event, properties);
}

// Attaches { name, message } extracted from `err` to `properties` and fires `event`.
// Message is capped, not allowlisted: full stable error-code taxonomy is a
// bigger design change (loses exact diagnostic text like the RangeError this
// feature exists to catch) — deferred pending a product decision.

export function captureError(
  event: string,
  err: unknown,
  properties?: Record<string, unknown>,
): void {
  if (!enabled) return;
  const message = err instanceof Error ? err.message : String(err);
  posthog.capture(event, {
    ...properties,
    name: err instanceof Error ? err.name : "unknown",
    message:
      message.length > MAX_TELEMETRY_MESSAGE_LENGTH
        ? `${message.slice(0, MAX_TELEMETRY_MESSAGE_LENGTH)}…`
        : message,
  });
}
