/**
 * Centralised logger (COMP-15, POPIA).
 *
 * Payroll data is financial + personal information. To avoid leaking PII or
 * financial figures into the browser console (which can be captured by session
 * recorders, support tooling, or shoulder-surfing), diagnostic logs are gated to
 * development builds and error logs are reduced to a safe message string.
 *
 * Rules of thumb for callers:
 *  - Use `logger.debug` / `logger.info` for diagnostics. These NEVER run in
 *    production, but still avoid passing raw records/payloads.
 *  - Use `logger.warn` / `logger.error` for genuine problems, and pass
 *    `toLogError(error)` (a message string) rather than the raw error object or
 *    any data payload, so row data embedded in errors is not printed.
 */

const isDev: boolean = (() => {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } })?.env?.DEV);
  } catch {
    return false;
  }
})();

type LogArg = unknown;

export const logger = {
  /** Development-only verbose diagnostics. Stripped from production builds. */
  debug: (...args: LogArg[]): void => {
    if (isDev) console.debug(...args);
  },
  /** Development-only informational logs. Stripped from production builds. */
  info: (...args: LogArg[]): void => {
    if (isDev) console.info(...args);
  },
  /** Warnings are always emitted — pass messages, not data payloads. */
  warn: (...args: LogArg[]): void => {
    console.warn(...args);
  },
  /** Errors are always emitted — pass messages, not data payloads. */
  error: (...args: LogArg[]): void => {
    console.error(...args);
  },
};

/**
 * Reduce any thrown value to a safe, non-PII message string. Supabase errors can
 * carry row data in `details`/`hint`; this returns only the human-readable
 * message so we never print the underlying record.
 */
export function toLogError(error: unknown): string {
  if (error == null) return "unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const maybe = error as { message?: unknown; error_description?: unknown };
    if (typeof maybe.message === "string") return maybe.message;
    if (typeof maybe.error_description === "string") return maybe.error_description;
  }
  return "unexpected error";
}
