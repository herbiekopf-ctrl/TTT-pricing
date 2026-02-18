import { PrismaClient } from "@prisma/client";
import { createFallbackPrisma } from "@/lib/fallbackDb";

const globalForPrisma = globalThis as unknown as { prisma: any | undefined };

function createPrismaClient() {
  try {
    return new PrismaClient({ log: ["error", "warn"] });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Prisma client unavailable, using in-memory fallback DB.", error);
    }
    return createFallbackPrisma();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
