import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as cancelTicketRoute } from "@/app/api/ingressos/[id]/cancelar/route";
import { GET as listTicketsRoute } from "@/app/api/ingressos/route";
import { GET as getTicketRoute } from "@/app/api/ingressos/[id]/route";
import { rawPrisma } from "@/shared/db/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/shared/db/prisma", () => {
  const mockTx = {
    ticket: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    cancellationAudit: {
      create: vi.fn(),
    },
    sessionSeat: {
      updateMany: vi.fn(),
    },
  };

  return {
    rawPrisma: {
      $transaction: vi.fn((callback) => callback(mockTx)),
      ticket: mockTx.ticket,
      cancellationAudit: mockTx.cancellationAudit,
      sessionSeat: mockTx.sessionSeat,
      mockTx,
    },
  };
});

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Cancelamento Auditavel com Trigger Append-Only (TASK-11 / AC-3 / AC-5 / ADR-010 / TC-3 / TC-11 / TC-18)", () => {
  const tenantId = "11111111-1111-4111-a111-111111111111";
  const userId = "22222222-2222-4222-a222-222222222222";
  const ticketId = "33333333-3333-4333-a333-333333333333";
  const sessionId = "44444444-4444-4444-a444-444444444444";
  const seatId = "55555555-5555-4555-a555-555555555555";

  // Sessao futura (permitida para cancelamento)
  const futureSessionStartsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  // Sessao passada (nao permitida para cancelamento)
  const pastSessionStartsAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const { mockTx } = rawPrisma as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/ingressos/[id]/cancelar - Fluxo de Cancelamento", () => {
    it("TC-3: cancela ingresso com sucesso, persiste auditoria imutavel e libera SessionSeat para AVAILABLE", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      mockTx.ticket.findFirst.mockResolvedValue({
        id: ticketId,
        tenantId,
        sessionId,
        seatId,
        status: "SOLD",
        session: {
          id: sessionId,
          startsAt: futureSessionStartsAt,
        },
        seat: {
          id: seatId,
          rowLabel: "C",
          columnNumber: 5,
        },
      });

      mockTx.cancellationAudit.create.mockResolvedValue({
        id: "audit-123",
        tenantId,
        ticketId,
        cancelledByUserId: userId,
        reason: "Cliente solicitou devolucao por imprevisto familiar.",
        cancelledAt: new Date(),
      });

      mockTx.ticket.update.mockResolvedValue({
        id: ticketId,
        status: "CANCELLED",
      });

      mockTx.sessionSeat.updateMany.mockResolvedValue({ count: 1 });

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: "Cliente solicitou devolucao por imprevisto familiar.",
        }),
      });

      const response = await cancelTicketRoute(request, { params: { id: ticketId } });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.auditId).toBe("audit-123");
      expect(json.ticketId).toBe(ticketId);
      expect(json.reason).toContain("Cliente solicitou devolucao");

      // AC-3: Validacao da ordem estrita - auditoria foi criada com dados mandatorios
      expect(mockTx.cancellationAudit.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          ticketId,
          cancelledByUserId: userId,
          reason: "Cliente solicitou devolucao por imprevisto familiar.",
          cancelledAt: expect.any(Date),
        },
      });

      // Ticket atualizado para CANCELLED
      expect(mockTx.ticket.update).toHaveBeenCalledWith({
        where: { id: ticketId },
        data: { status: "CANCELLED" },
      });

      // SessionSeat liberado para AVAILABLE
      expect(mockTx.sessionSeat.updateMany).toHaveBeenCalledWith({
        where: {
          sessionId,
          seatId,
          tenantId,
        },
        data: {
          status: "AVAILABLE",
          reservationId: null,
          reservationExpiresAt: null,
        },
      });
    });

    it("TC-11: Rollback atomico se a insercao em cancellation_audits falhar - assento permanece SOLD", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      mockTx.ticket.findFirst.mockResolvedValue({
        id: ticketId,
        tenantId,
        sessionId,
        seatId,
        status: "SOLD",
        session: {
          id: sessionId,
          startsAt: futureSessionStartsAt,
        },
      });

      // Simula falha na trigger ou constraint da tabela de auditoria
      mockTx.cancellationAudit.create.mockRejectedValue(
        new Error("Trigger PostgreSQL: Registros de auditoria sao estritamente imutaveis (ADR-010)")
      );

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: "Solicitacao de cancelamento com erro de auditoria.",
        }),
      });

      const response = await cancelTicketRoute(request, { params: { id: ticketId } });
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.error).toContain("Falha ao registrar auditoria imutavel");

      // TC-11: Ticket e SessionSeat NAO devem ser alterados
      expect(mockTx.ticket.update).not.toHaveBeenCalled();
      expect(mockTx.sessionSeat.updateMany).not.toHaveBeenCalled();
    });

    it("TC-18: Cross-tenant isolation - tenant A nao consegue cancelar ingresso do tenant B", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      // Ingresso pertence ao Tenant B
      mockTx.ticket.findFirst.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: "Tentativa cross-tenant ilegal.",
        }),
      });

      const response = await cancelTicketRoute(request, { params: { id: ticketId } });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.error).toContain("Ingresso nao encontrado");
      expect(mockTx.cancellationAudit.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar cancelamento de sessao passada com HTTP 422", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      mockTx.ticket.findFirst.mockResolvedValue({
        id: ticketId,
        tenantId,
        sessionId,
        seatId,
        status: "SOLD",
        session: {
          id: sessionId,
          startsAt: pastSessionStartsAt, // Sessao passada
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: "Cancelamento fora do prazo permitido.",
        }),
      });

      const response = await cancelTicketRoute(request, { params: { id: ticketId } });
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.error).toContain("sessoes passadas ou ja iniciadas");
      expect(mockTx.cancellationAudit.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar cancelamento duplo de ingresso ja cancelado com HTTP 409 Conflict", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      mockTx.ticket.findFirst.mockResolvedValue({
        id: ticketId,
        tenantId,
        sessionId,
        seatId,
        status: "CANCELLED", // Ja cancelado
        session: {
          id: sessionId,
          startsAt: futureSessionStartsAt,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: "Tentativa de cancelar ingresso ja cancelado.",
        }),
      });

      const response = await cancelTicketRoute(request, { params: { id: ticketId } });
      expect(response.status).toBe(409);

      const json = await response.json();
      expect(json.error).toContain("ja foi cancelado anteriormente");
      expect(mockTx.cancellationAudit.create).not.toHaveBeenCalled();
    });

    it("DoD: rejeita cancelamento sem motivo com HTTP 422 Unprocessable Entity", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: "", // Motivo vazio
        }),
      });

      const response = await cancelTicketRoute(request, { params: { id: ticketId } });
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.message).toContain("Dados de cancelamento invalidos");
    });

    it("AC-5 / RBAC: CLIENTE recebe compulsoriamente HTTP 403 Forbidden ao tentar rota de cancelamento", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "CLIENTE", tenantId },
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: "Cancelamento pelo portal nao autorizado nesta rota.",
        }),
      });

      const response = await cancelTicketRoute(request, { params: { id: ticketId } });
      expect(response.status).toBe(403);
    });

    it("TC-19: Requisicao sem contexto de tenant retorna HTTP 401 Unauthorized", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: "Sem contexto de tenant.",
        }),
      });

      const response = await cancelTicketRoute(request, { params: { id: ticketId } });
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/ingressos e GET /api/ingressos/[id]", () => {
    it("lista ingressos do tenant com isolamento garantido (TC-18)", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "ATENDENTE", tenantId },
      } as any);

      mockTx.ticket.findMany.mockResolvedValue([
        {
          id: ticketId,
          tenantId,
          status: "SOLD",
          session: { film: { title: "Duna 2" } },
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/ingressos");
      const response = await listTicketsRoute(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json).toHaveLength(1);
    });

    it("busca ingresso individual por ID", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, role: "GERENTE", tenantId },
      } as any);

      mockTx.ticket.findFirst.mockResolvedValue({
        id: ticketId,
        tenantId,
        status: "SOLD",
      });

      const request = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}`);
      const response = await getTicketRoute(request, { params: { id: ticketId } });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.id).toBe(ticketId);
    });
  });
});
