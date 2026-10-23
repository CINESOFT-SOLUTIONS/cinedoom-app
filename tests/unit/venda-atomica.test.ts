import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as processSaleRoute } from "@/app/api/vendas/route";
import { rawPrisma } from "@/shared/db/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/shared/db/prisma", () => {
  const mockTx = {
    session: {
      findFirst: vi.fn(),
    },
    sessionSeat: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    buyer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  return {
    rawPrisma: {
      $transaction: vi.fn((callback) => callback(mockTx)),
      session: mockTx.session,
      sessionSeat: mockTx.sessionSeat,
      buyer: mockTx.buyer,
      ticket: mockTx.ticket,
      mockTx,
    },
  };
});

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Venda Atomica ACID com SELECT FOR UPDATE (TASK-10 / AC-1 / AC-6 / ADR-004 / ADR-007 / TC-1 / TC-9 / TC-14 / TC-17)", () => {
  const tenantId = "11111111-1111-4111-a111-111111111111";
  const userId = "22222222-2222-4222-a222-222222222222";
  const sessionId = "33333333-3333-4333-a333-333333333333";
  const sessionSeatId1 = "44444444-4444-4444-a444-444444444441";
  const sessionSeatId2 = "44444444-4444-4444-a444-444444444442";

  // CPF valido pelo algoritmo de digitos verificadores
  const validCpf = "52998224725";

  const validPayload = {
    sessionId,
    sessionSeatIds: [sessionSeatId2, sessionSeatId1], // IDs desordenados para testar ordenacao anti-deadlock
    buyer: {
      name: "Carlos Eduardo da Silva",
      cpf: "529.982.247-25",
      email: "carlos.eduardo@email.com",
      lgpdConsent: true,
    },
  };

  const { mockTx } = rawPrisma as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/vendas - Fluxo Transacional Principal", () => {
    it("TC-1: processa venda com sucesso, bloqueia assentos e retorna HTTP 201 com dados cifrados LGPD", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      mockTx.session.findFirst.mockResolvedValue({
        id: sessionId,
        price: 35.0,
        status: "SCHEDULED",
      });

      // Simula lock pessimista SELECT FOR UPDATE retornando assentos AVAILABLE
      mockTx.$queryRaw.mockResolvedValue([
        { id: sessionSeatId1, status: "AVAILABLE", seat_id: "seat-1" },
        { id: sessionSeatId2, status: "AVAILABLE", seat_id: "seat-2" },
      ]);

      mockTx.buyer.findFirst.mockResolvedValue(null);
      mockTx.buyer.create.mockResolvedValue({
        id: "buyer-123",
        tenantId,
        name: "Carlos Eduardo da Silva",
        email: "carlos.eduardo@email.com",
      });

      mockTx.sessionSeat.updateMany.mockResolvedValue({ count: 2 });

      mockTx.ticket.create
        .mockResolvedValueOnce({
          id: "ticket-1",
          seatId: "seat-1",
          price: 35.0,
          status: "SOLD",
          soldAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: "ticket-2",
          seatId: "seat-2",
          price: 35.0,
          status: "SOLD",
          soldAt: new Date(),
        });

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.tickets).toHaveLength(2);
      expect(json.totalAmount).toBe(70.0);
      expect(json.buyer.name).toBe("Carlos Eduardo da Silva");
      expect(json.buyer.cpfMasked).toBe("***.***.247-25");

      // Validacao de protecao LGPD: SessionSeat atualizada para SOLD
      expect(mockTx.sessionSeat.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [sessionSeatId1, sessionSeatId2] }, // Ordenados crescentemente
          sessionId,
          tenantId,
        },
        data: {
          status: "SOLD",
          reservationId: null,
          reservationExpiresAt: null,
        },
      });
    });

    it("TC-1 & TC-9: rejeita venda e retorna HTTP 409 Conflict se qualquer assento ja estiver vendido ou indisponivel", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      mockTx.session.findFirst.mockResolvedValue({
        id: sessionId,
        price: 35.0,
        status: "SCHEDULED",
      });

      // Assento 1 esta AVAILABLE, mas o assento 2 ja foi comprado por outro terminal (SOLD)
      mockTx.$queryRaw.mockResolvedValue([
        { id: sessionSeatId1, status: "AVAILABLE", seat_id: "seat-1" },
        { id: sessionSeatId2, status: "SOLD", seat_id: "seat-2" },
      ]);

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(409);

      const json = await response.json();
      expect(json.error).toContain("ja foi vendido ou esta indisponivel");

      // Garante que nenhum ingresso foi criado e nenhuma atualizacao ocorreu
      expect(mockTx.ticket.create).not.toHaveBeenCalled();
      expect(mockTx.sessionSeat.updateMany).not.toHaveBeenCalled();
    });

    it("TC-17: Cross-tenant isolation - retorna HTTP 404 se a sessao nao pertencer ao tenant autenticado", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      // Sessao pertence a outro tenant
      mockTx.session.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.error).toContain("Sessao nao encontrada");
      expect(mockTx.$queryRaw).not.toHaveBeenCalled();
    });

    it("TC-19: Requisicao sem contexto de tenant retorna HTTP 401 Unauthorized", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(401);
    });

    it("AC-5 / RBAC: CLIENTE tentando chamar rota de bilheteria fisica recebe HTTP 403 Forbidden", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "CLIENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
    });
  });

  describe("TC-14: Validacao Zod e LGPD (HTTP 422 Unprocessable Entity)", () => {
    it("deve rejeitar venda quando consentimento LGPD for omitido ou false", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      const invalidPayload = {
        ...validPayload,
        buyer: {
          ...validPayload.buyer,
          lgpdConsent: false,
        },
      };

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: JSON.stringify(invalidPayload),
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.message).toContain("Dados de venda invalidos");
      const consentError = json.errors.find((e: any) => e.field.includes("lgpdConsent"));
      expect(consentError).toBeDefined();
    });

    it("deve rejeitar venda quando CPF for matematicamente invalido", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      const invalidPayload = {
        ...validPayload,
        buyer: {
          ...validPayload.buyer,
          cpf: "111.111.111-11", // CPF com digitos repetidos invalidos
        },
      };

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: JSON.stringify(invalidPayload),
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(422);

      const json = await response.json();
      const cpfError = json.errors.find((e: any) => e.field.includes("cpf"));
      expect(cpfError).toBeDefined();
      expect(cpfError.message).toContain("CPF informado e invalido");
    });

    it("deve rejeitar venda sem assentos selecionados", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      const invalidPayload = {
        ...validPayload,
        sessionSeatIds: [],
      };

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: JSON.stringify(invalidPayload),
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(422);

      const json = await response.json();
      const seatError = json.errors.find((e: any) => e.field.includes("sessionSeatIds"));
      expect(seatError).toBeDefined();
    });

    it("deve retornar HTTP 400 para JSON malformatado", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        body: "{ malformed json",
      });

      const response = await processSaleRoute(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Payload JSON invalido");
    });
  });
});
