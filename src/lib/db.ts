import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Retries a Prisma query once after a connection failure (Neon auto-suspend).
 * First wake-up attempt may fail; the retry ~2s later usually succeeds.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Can't reach database") || msg.includes("P1001") || msg.includes("P1008")) {
      await new Promise((r) => setTimeout(r, 2000));
      return fn();
    }
    throw err;
  }
}
