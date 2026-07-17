/** Shared snake_case ↔ camelCase converters for Supabase row mapping. */

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function keysToCamelCase(value: unknown): UnknownRecord {
  if (!isRecord(value)) return {};

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = entry;
  }
  return out;
}

export function keysToSnakeCase(value: unknown): UnknownRecord {
  if (!isRecord(value)) return {};

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[snake] = entry;
  }
  return out;
}

export function mapKeysToCamelCase<T>(value: unknown): T {
  return keysToCamelCase(value) as T;
}
