import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Supabase Transaction pooler (PgBouncer) must use pgbouncer mode with Prisma or prepared
 * statements fail (42P05 / 26000). If DATABASE_URL was pasted without the flag, fix it at runtime.
 */
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;

  const hasPgbouncerFlag = raw.includes("pgbouncer=true") || raw.includes("pgbouncer=1");
  const looksLikeSupabasePooler =
    raw.includes("pooler.supabase.com") || /:6543([/?#]|$)/.test(raw);
  if (!looksLikeSupabasePooler || hasPgbouncerFlag) {
    return raw;
  }

  if (process.env.NODE_ENV === "development") {
    console.info(
      "[prisma] Supabase pooler URL without pgbouncer mode — appending query flags for Prisma (see web/.env.example).",
    );
  }
  const sep = raw.includes("?") ? "&" : "?";
  let out = `${raw}${sep}pgbouncer=true`;
  // Serverless: keep 1 connection per instance. Local dev runs many parallel API routes & UI fetches;
  // Promise.all on Prisma + connection_limit=1 exhausts the pool (P2024). See dashboard briefing route.
  if (!raw.includes("connection_limit")) {
    const limit = process.env.NODE_ENV === "production" ? 1 : 10;
    out += `&connection_limit=${limit}`;
  }
  if (!raw.includes("pool_timeout")) {
    out += `&pool_timeout=${process.env.NODE_ENV === "production" ? 10 : 30}`;
  }
  return out;
}

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
