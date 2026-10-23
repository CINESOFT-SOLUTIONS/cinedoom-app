import { PrismaClient } from "@prisma/client";
import { withTenancy } from "@/modules/tenancy/prisma-tenancy-extension";

const globalForPrisma = globalThis as unknown as {
  rawPrisma: PrismaClient | undefined;
  tenantPrisma: ReturnType<typeof withTenancy> | undefined;
};

// Cliente raw para operacoes administrativas/onboarding B2B sem escopo
export const rawPrisma =
  globalForPrisma.rawPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Cliente com extensao multi-tenant compulsoria (AC-4)
export const prisma = globalForPrisma.tenantPrisma ?? withTenancy(rawPrisma);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.rawPrisma = rawPrisma;
  globalForPrisma.tenantPrisma = prisma;
}

export type TenantPrismaClient = typeof prisma;
