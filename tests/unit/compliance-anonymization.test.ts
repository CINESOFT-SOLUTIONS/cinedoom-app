import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { rawPrisma } from "@/shared/db/prisma";
import {
  AnonymizationService,
  anonymizeTitularSchema,
  formatZodErrors,
  TitularNotFoundError,
  TitularAlreadyAnonymizedError,
} from "@/modules/compliance";
import { CryptoService } from "@/modules/crypto";
import { POST as postAnonimizar } from "@/app/api/titulares/anonimizar/route";
import { GET as getTitulares } from "@/app/api/titulares/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  rawPrisma: {
    buyer: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      count: vi.fn(),
    },
  },
  prisma: {},
}));

describe("Compliance LGPD — Anonimização In-Place Art. 18 (TASK-14 / AC-6 / ADR-009)", () => {
  const tenantId = "11111111-1111-4111-a111-111111111111";
  const managerId = "00000000-0000-4000-a000-000000000001";
  const attendantId = "00000000-0000-4000-a000-000000000002";
  const buyerId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const validCpf = "52998224725";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validação com Zod (anonymizeTitularSchema)", () => {
    it("valida payload contendo CPF válido", () => {
      const result = anonymizeTitularSchema.safeParse({ cpf: validCpf });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cpf).toBe(validCpf);
        expect(result.data.reason).toContain("Art. 18 da LGPD");
      }
    });

    it("valida payload contendo buyerId válido em formato UUID", () => {
      const result = anonymizeTitularSchema.safeParse({ buyerId });
      expect(result.success).toBe(true);
    });

    it("rejeita payload sem CPF e sem buyerId", () => {
      const result = anonymizeTitularSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors[0].message).toContain("ao menos o CPF ou o ID");
      }
    });

    it("rejeita CPF com dígito verificador inválido", () => {
      const result = anonymizeTitularSchema.safeParse({ cpf: "111.222.333-44" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some((e) => e.field === "cpf")).toBe(true);
      }
    });
  });

  describe("AnonymizationService (Camada de Domínio & ADR-009)", () => {
    it("anonymizeTitular executa sobrescrita in-place de campos PII e preserva ID e FKs", async () => {
      const cpfHash = CryptoService.hashCPF(validCpf);
      const cpfEncrypted = CryptoService.encryptCPF(validCpf);

      const mockExistingBuyer = {
        id: buyerId,
        tenantId,
        name: "Maria Silva",
        email: "maria@provedor.com",
        cpfHash,
        cpfEncrypted,
        lgpdConsentAt: new Date("2026-01-10T10:00:00Z"),
        anonymizedAt: null,
      };

      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue(mockExistingBuyer as any);
      vi.mocked(rawPrisma.ticket.count).mockResolvedValue(3);
      vi.mocked(rawPrisma.buyer.update).mockImplementation(
        ((async (args: any) => ({
          id: buyerId,
          tenantId,
          ...args.data,
        })) as any)
      );

      const result = await AnonymizationService.anonymizeTitular(
        { buyerId, reason: "Solicitacao via suporte" },
        tenantId
      );

      expect(result.buyerId).toBe(buyerId);
      expect(result.name).toBe("[DADO PESSOAL ANONIMIZADO - LGPD ART. 18]");
      expect(result.email).toContain("@lgpd.cinedoom.local");
      expect(result.ticketsPreserved).toBe(3);
      expect(result.anonymizedAt).toBeInstanceOf(Date);

      // Certifica que o update expurgou o hash de busca e o valor cifrado original
      const updateCall = vi.mocked(rawPrisma.buyer.update).mock.calls[0][0];
      expect(updateCall.where.id).toBe(buyerId);
      expect(updateCall.data.name).toBe("[DADO PESSOAL ANONIMIZADO - LGPD ART. 18]");
      expect(updateCall.data.cpfHash).not.toBe(cpfHash);
      expect(updateCall.data.anonymizedAt).toBeDefined();
    });

    it("lança TitularNotFoundError se o comprador pertencer a outro tenant (isolamento multi-tenant)", async () => {
      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue(null);

      await expect(
        AnonymizationService.anonymizeTitular({ buyerId }, tenantId)
      ).rejects.toThrow(TitularNotFoundError);

      expect(rawPrisma.buyer.update).not.toHaveBeenCalled();
    });

    it("lança TitularAlreadyAnonymizedError se o comprador já foi anonimizado previamente", async () => {
      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue({
        id: buyerId,
        tenantId,
        name: "[DADO PESSOAL ANONIMIZADO - LGPD ART. 18]",
        email: "anonimizado@lgpd.cinedoom.local",
        cpfHash: "dummy-hash",
        cpfEncrypted: "dummy-enc",
        anonymizedAt: new Date("2026-02-15T14:30:00Z"),
      } as any);

      await expect(
        AnonymizationService.anonymizeTitular({ buyerId }, tenantId)
      ).rejects.toThrow(TitularAlreadyAnonymizedError);

      expect(rawPrisma.buyer.update).not.toHaveBeenCalled();
    });

    it("findTitular retorna dados mascarados para auditoria prévia", async () => {
      const cpfEncrypted = CryptoService.encryptCPF(validCpf);
      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue({
        id: buyerId,
        tenantId,
        name: "Maria Silva",
        email: "maria@provedor.com",
        cpfHash: CryptoService.hashCPF(validCpf),
        cpfEncrypted,
        anonymizedAt: null,
        lgpdConsentAt: new Date(),
        _count: { tickets: 4 },
      } as any);

      const titular = await AnonymizationService.findTitular(validCpf, tenantId);
      expect(titular).not.toBeNull();
      expect(titular?.name).toBe("Maria Silva");
      expect(titular?.isAnonymized).toBe(false);
      expect(titular?.ticketsCount).toBe(4);
      expect(titular?.cpfMasked).toContain("***.***.");
    });
  });

  describe("Route Handlers /api/titulares (RBAC & Status HTTP)", () => {
    it("AC-5 / AC-6: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar anonimizar titular", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: attendantId, role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/titulares/anonimizar", {
        method: "POST",
        body: JSON.stringify({ buyerId }),
      });

      const response = await postAnonimizar(request);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
      expect(rawPrisma.buyer.update).not.toHaveBeenCalled();
    });

    it("GERENTE recebe HTTP 200 OK com resumo de anonimização e ingressos preservados", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue({
        id: buyerId,
        tenantId,
        name: "Comprador Exemplo",
        email: "comprador@exemplo.com",
        cpfHash: CryptoService.hashCPF(validCpf),
        cpfEncrypted: CryptoService.encryptCPF(validCpf),
        anonymizedAt: null,
      } as any);

      vi.mocked(rawPrisma.ticket.count).mockResolvedValue(2);
      vi.mocked(rawPrisma.buyer.update).mockResolvedValue({
        id: buyerId,
        tenantId,
        name: "[DADO PESSOAL ANONIMIZADO - LGPD ART. 18]",
        email: "anonimizado@lgpd.cinedoom.local",
        anonymizedAt: new Date(),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/titulares/anonimizar", {
        method: "POST",
        body: JSON.stringify({ cpf: validCpf }),
      });

      const response = await postAnonimizar(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.buyerId).toBe(buyerId);
      expect(json.ticketsPreserved).toBe(2);
      expect(json.message).toContain("Art. 18 da LGPD");
    });

    it("POST /api/titulares/anonimizar retorna 404 se titular não existir no tenant", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/titulares/anonimizar", {
        method: "POST",
        body: JSON.stringify({ buyerId }),
      });

      const response = await postAnonimizar(request);
      expect(response.status).toBe(404);
    });

    it("POST /api/titulares/anonimizar retorna 409 se titular já estiver anonimizado", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue({
        id: buyerId,
        tenantId,
        anonymizedAt: new Date("2026-01-01T00:00:00Z"),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/titulares/anonimizar", {
        method: "POST",
        body: JSON.stringify({ buyerId }),
      });

      const response = await postAnonimizar(request);
      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error).toContain("ja foram anonimizados");
    });

    it("POST /api/titulares/anonimizar retorna 422 para payload inválido", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/titulares/anonimizar", {
        method: "POST",
        body: JSON.stringify({ cpf: "cpf-invalido" }),
      });

      const response = await postAnonimizar(request);
      expect(response.status).toBe(422);
    });

    it("GET /api/titulares retorna dados do titular para o Gerente", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue({
        id: buyerId,
        tenantId,
        name: "Maria Silva",
        email: "maria@provedor.com",
        cpfHash: CryptoService.hashCPF(validCpf),
        cpfEncrypted: CryptoService.encryptCPF(validCpf),
        anonymizedAt: null,
        lgpdConsentAt: new Date(),
        _count: { tickets: 1 },
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/titulares?cpf=${validCpf}`);
      const response = await getTitulares(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.name).toBe("Maria Silva");
    });

    it("AC-5: ATENDENTE recebe 403 ao tentar GET /api/titulares", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: attendantId, role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/titulares?cpf=${validCpf}`);
      const response = await getTitulares(request);
      expect(response.status).toBe(403);
    });
  });
});
