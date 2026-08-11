export function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function pickString(value: unknown, fallback: string | null): string | null {
  return typeof value === "string" ? value : fallback;
}
