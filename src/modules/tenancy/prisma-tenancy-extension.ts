import { Prisma, PrismaClient } from "@prisma/client";
import { getTenantId, TenantContextError } from "./tenancy-context";

export const TENANT_SCOPED_MODELS: string[] = [
  "Film",
  "Room",
  "Seat",
  "Session",
  "SessionSeat",
  "Buyer",
  "Ticket",
  "Reservation",
  "CancellationAudit",
  "User",
];

const READ_OPERATIONS = [
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
];

const MUTATE_WHERE_OPERATIONS = [
  "update",
  "updateMany",
  "delete",
  "deleteMany",
];

/**
 * Cria uma extensao Prisma ($extends) que injeta compulsoriamente
 * o filtro WHERE tenant_id = :tenantId em todas as queries e mutacoes.
 * Cumpre AC-4, TC-4, TC-12 e TC-19 da especificacao.
 */
export function withTenancy<T extends PrismaClient>(prismaClient: T) {
  return prismaClient.$extends({
    name: "cinedoom-tenancy-extension",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Modelos nao escopados (ex: Tenant puro para onboarding) passam direto
          if (!model || !TENANT_SCOPED_MODELS.includes(model)) {
            return query(args);
          }

          // Permite bypass explicito de sistema (ex: migracao interna, cron daemon de infra)
          if ((args as any)?.__systemBypass === true) {
            delete (args as any).__systemBypass;
            return query(args);
          }

          const tenantId = getTenantId();

          // TC-19: Se o modelo eh protegido e nao ha contexto de tenant ativo, aborta imediatamente
          if (!tenantId) {
            throw new TenantContextError(
              `Acesso a entidade ${model} requer contexto de tenant ativo (AC-4 / TC-19).`
            );
          }

          const currentArgs = (args ?? {}) as any;

          // Injeta tenantId em operacoes de leitura
          if (READ_OPERATIONS.includes(operation)) {
            currentArgs.where = {
              ...(currentArgs.where ?? {}),
              tenantId,
            };
          }
          // Para findUnique, converte internamente para findFirst escopado por tenantId
          else if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            const originalWhere = currentArgs.where ?? {};
            return (prismaClient as any)[model.toLowerCase()].findFirst({
              where: {
                ...originalWhere,
                tenantId,
              },
              select: currentArgs.select,
              include: currentArgs.include,
            });
          }
          // Injeta tenantId em operacoes de criacao
          else if (operation === "create") {
            currentArgs.data = {
              ...(currentArgs.data ?? {}),
              tenantId,
            };
          } else if (operation === "createMany") {
            if (Array.isArray(currentArgs.data)) {
              currentArgs.data = currentArgs.data.map((item: any) => ({
                ...item,
                tenantId,
              }));
            }
          }
          // Injeta tenantId em operacoes de mutacao
          else if (MUTATE_WHERE_OPERATIONS.includes(operation)) {
            currentArgs.where = {
              ...(currentArgs.where ?? {}),
              tenantId,
            };
          } else if (operation === "upsert") {
            currentArgs.where = {
              ...(currentArgs.where ?? {}),
              tenantId,
            };
            currentArgs.create = {
              ...(currentArgs.create ?? {}),
              tenantId,
            };
            currentArgs.update = {
              ...(currentArgs.update ?? {}),
              tenantId,
            };
          }

          return query(currentArgs);
        },
      },
    },
  });
}
