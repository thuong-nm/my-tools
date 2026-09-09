import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/client/client";

// The ONLY module allowed to construct a client. Prisma 7 makes a driver adapter mandatory (no
// Rust engine, no `datasources`) and generates into prisma/generated/client/, not node_modules.

// Reused across hot reloads: otherwise every save in `next dev` builds a new pool and Postgres
// runs out of connections within minutes.
const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
};

export type PrismaDatabase = PrismaClient;

export function createPrismaClient(input: {
  databaseUrl: string;
  isProduction: boolean;
}): PrismaClient {
  const existing = globalForPrisma.prismaClient;
  if (existing) return existing;

  const adapter = new PrismaPg({ connectionString: input.databaseUrl });

  const client = new PrismaClient({
    adapter,
    // Queries can contain personal data, so they stay out of production logs.
    log: input.isProduction ? ["error"] : ["warn", "error"],
  });

  if (!input.isProduction) globalForPrisma.prismaClient = client;

  return client;
}

/** Test/teardown helper: drop the cached client so a new pool can be built. */
export async function disconnectPrismaClient(): Promise<void> {
  const existing = globalForPrisma.prismaClient;
  if (existing) {
    await existing.$disconnect();
    globalForPrisma.prismaClient = undefined;
  }
}
