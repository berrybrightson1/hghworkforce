/**
 * Structured server-side logging for API routes and server components.
 * Keeps a single shape so logs are easy to grep in Vercel / host dashboards.
 */
export function logServerError(
  scope: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      message,
      stack,
      ...extra,
    }),
  );
}
