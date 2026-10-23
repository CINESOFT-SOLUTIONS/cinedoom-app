import { describe, it, expect, vi } from "vitest";
import {
  runWithTenant,
  getTenantId,
  requireTenantId,
  TenantContextError,
  withTenancy,
  TENANT_SCOPED_MODELS,
} from "@/modules/tenancy";

describe("Multi-tenant Row-Level Isolation (AC-4 / TC-4 / TC-12 / TC-19)", () => {
  describe("AsyncLocalStorage Tenancy Context", () => {
    it("deve isolar o tenantId no escopo assincrono e retornar null fora dele", async () => {
      expect(getTenantId()).toBeNull();
      expect(() => requireTenantId()).toThrow(TenantContextError);

      await runWithTenant("tenant-cinema-gloria", async () => {
        expect(getTenantId()).toBe("tenant-cinema-gloria");
        expect(requireTenantId()).toBe("tenant-cinema-gloria");
      });

      expect(getTenantId()).toBeNull();
    });

    it("TC-12: duas requisicoes assincronas paralelas devem manter tenants completamente isolados", async () => {
      const results = await Promise.all([
        runWithTenant("tenant-A", async () => {
          // simula latencia de I/O
          await new Promise((r) => setTimeout(r, 20));
          return getTenantId();
        }),
        runWithTenant("tenant-B", async () => {
          await new Promise((r) => setTimeout(r, 10));
          return getTenantId();
        }),
        runWithTenant("tenant-C", async () => {
          await new Promise((r) => setTimeout(r, 5));
          return getTenantId();
        }),
      ]);

      expect(results[0]).toBe("tenant-A");
      expect(results[1]).toBe("tenant-B");
      expect(results[2]).toBe("tenant-C");
    });

    it("deve lancar erro se fornecido tenantId vazio ou invalido", async () => {
      await expect(runWithTenant("", () => Promise.resolve())).rejects.toThrow(
        TenantContextError
      );
      await expect(
        runWithTenant("   ", () => Promise.resolve())
      ).rejects.toThrow(TenantContextError);
    });
  });

  describe("Prisma Tenancy Extension Query Interception", () => {
    it("TC-19: query em modelo protegido fora de contexto de tenant deve lancar erro antes de atingir o banco", async () => {
      const mockQuery = vi.fn().mockResolvedValue([]);
      const mockClient = {
        $extends: (ext: any) => {
          return {
            executeOperation: (model: string, operation: string, args: any) =>
              ext.query.$allModels.$allOperations({
                model,
                operation,
                args,
                query: mockQuery,
              }),
          };
        },
      } as any;

      const extended = withTenancy(mockClient) as any;

      // Tentativa de buscar filmes fora de contexto
      await expect(
        extended.executeOperation("Film", "findMany", { where: {} })
      ).rejects.toThrow(
        "Acesso a entidade Film requer contexto de tenant ativo (AC-4 / TC-19)."
      );

      // O banco nao deve ser chamado
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("TC-4: query dentro de runWithTenant deve injetar compulsoriamente where.tenantId", async () => {
      const mockQuery = vi.fn().mockImplementation((args) => Promise.resolve(args));
      const mockClient = {
        $extends: (ext: any) => {
          return {
            executeOperation: (model: string, operation: string, args: any) =>
              ext.query.$allModels.$allOperations({
                model,
                operation,
                args,
                query: mockQuery,
              }),
          };
        },
      } as any;

      const extended = withTenancy(mockClient) as any;

      await runWithTenant("tenant-cine-alpha", async () => {
        const result = await extended.executeOperation("Film", "findMany", {
          where: { title: "Matrix" },
        });

        expect(mockQuery).toHaveBeenCalledOnce();
        expect(result.where).toEqual({
          title: "Matrix",
          tenantId: "tenant-cine-alpha",
        });
      });
    });

    it("operacoes de escrita (create, update, delete) devem receber tenantId compulsoriamente", async () => {
      const mockQuery = vi.fn().mockImplementation((args) => Promise.resolve(args));
      const mockClient = {
        $extends: (ext: any) => {
          return {
            executeOperation: (model: string, operation: string, args: any) =>
              ext.query.$allModels.$allOperations({
                model,
                operation,
                args,
                query: mockQuery,
              }),
          };
        },
      } as any;

      const extended = withTenancy(mockClient) as any;

      await runWithTenant("tenant-cine-alpha", async () => {
        // Create
        const createResult = await extended.executeOperation("Film", "create", {
          data: { title: "Oppenheimer", durationMinutes: 180 },
        });
        expect(createResult.data.tenantId).toBe("tenant-cine-alpha");

        // Delete
        const deleteResult = await extended.executeOperation("Film", "delete", {
          where: { id: "filme-123" },
        });
        expect(deleteResult.where.tenantId).toBe("tenant-cine-alpha");
      });
    });

    it("modelos fora do escopo de tenant (ex: Tenant puro) passam sem injecao", async () => {
      const mockQuery = vi.fn().mockImplementation((args) => Promise.resolve(args));
      const mockClient = {
        $extends: (ext: any) => {
          return {
            executeOperation: (model: string, operation: string, args: any) =>
              ext.query.$allModels.$allOperations({
                model,
                operation,
                args,
                query: mockQuery,
              }),
          };
        },
      } as any;

      const extended = withTenancy(mockClient) as any;

      // Model Tenant nao requer tenantId
      const result = await extended.executeOperation("Tenant", "findMany", {
        where: { active: true },
      });
      expect(result.where).toEqual({ active: true });
      expect(mockQuery).toHaveBeenCalledOnce();
    });

    it("permite bypass explicito de sistema (__systemBypass) para rotas internas de migracao", async () => {
      const mockQuery = vi.fn().mockImplementation((args) => Promise.resolve(args));
      const mockClient = {
        $extends: (ext: any) => {
          return {
            executeOperation: (model: string, operation: string, args: any) =>
              ext.query.$allModels.$allOperations({
                model,
                operation,
                args,
                query: mockQuery,
              }),
          };
        },
      } as any;

      const extended = withTenancy(mockClient) as any;

      const result = await extended.executeOperation("Film", "findMany", {
        where: {},
        __systemBypass: true,
      });

      expect(mockQuery).toHaveBeenCalledOnce();
      expect(result.__systemBypass).toBeUndefined();
    });
  });

  describe("Lista de Modelos Protegidos", () => {
    it("deve incluir todas as 10 entidades de dominio que possuem tenant_id", () => {
      expect(TENANT_SCOPED_MODELS).toContain("Film");
      expect(TENANT_SCOPED_MODELS).toContain("Room");
      expect(TENANT_SCOPED_MODELS).toContain("Seat");
      expect(TENANT_SCOPED_MODELS).toContain("Session");
      expect(TENANT_SCOPED_MODELS).toContain("SessionSeat");
      expect(TENANT_SCOPED_MODELS).toContain("Buyer");
      expect(TENANT_SCOPED_MODELS).toContain("Ticket");
      expect(TENANT_SCOPED_MODELS).toContain("Reservation");
      expect(TENANT_SCOPED_MODELS).toContain("CancellationAudit");
      expect(TENANT_SCOPED_MODELS).toContain("User");
    });
  });
});
