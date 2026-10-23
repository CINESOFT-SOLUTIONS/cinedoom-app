import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSessionSeats } from "@/app/api/sessoes/[id]/assentos/route";
import { rawPrisma } from "@/shared/db/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/shared/db/prisma", () => {
  const mockSession = {
    findFirst: vi.fn(),
  };

  const mockSessionSeat = {
    findMany: vi.fn(),
  };

  return {
    rawPrisma: {
      session: mockSession,
      sessionSeat: mockSessionSeat,
    },
  };
});

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Polling do Mapa de Assentos (TASK-9 / TASK-10 / AC-2 / ADR-006 / TC-2 / TC-10 / TC-17)", () => {
  const tenantId = "11111111-1111-4111-a111-111111111111";
  const otherTenantId = "99999999-9999-4999-a999-999999999999";
  const sessionId = "22222222-2222-4222-a222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Route Handler GET /api/sessoes/[id]/assentos", () => {
    it("TC-2 & TC-10: responde com array leve de assentos e cabecalho Cache-Control: no-store", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.session.findFirst).mockResolvedValue({
        id: sessionId,
        price: 35.0,
        status: "SCHEDULED",
      } as any);

      const mockDbSeats = [
        {
          id: "ss-1",
          seatId: "seat-1",
          status: "AVAILABLE",
          seat: { rowLabel: "A", columnNumber: 1, seatCode: "A1" },
        },
        {
          id: "ss-2",
          seatId: "seat-2",
          status: "SOLD",
          seat: { rowLabel: "A", columnNumber: 2, seatCode: "A2" },
        },
        {
          id: "ss-3",
          seatId: "seat-3",
          status: "RESERVED",
          seat: { rowLabel: "B", columnNumber: 1, seatCode: "B1" },
        },
      ];

      vi.mocked(rawPrisma.sessionSeat.findMany).mockResolvedValue(mockDbSeats as any);

      const request = new NextRequest(`http://localhost:3000/api/sessoes/${sessionId}/assentos`);
      const response = await getSessionSeats(request, { params: { id: sessionId } });

      expect(response.status).toBe(200);

      // TC-10: Validacao estrita do cabecalho anti-cache
      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toContain("no-store");
      expect(cacheControl).toContain("no-cache");

      const payload = await response.json();
      expect(Array.isArray(payload)).toBe(true);
      expect(payload).toHaveLength(3);

      // Estrutura leve do payload (AC-2)
      expect(payload[0]).toEqual({
        id: "ss-1",
        seat_id: "seat-1",
        seatId: "seat-1",
        row: "A",
        rowLabel: "A",
        number: 1,
        columnNumber: 1,
        seatCode: "A1",
        status: "AVAILABLE",
        price: 35.0,
      });

      expect(payload[1].status).toBe("SOLD");
      expect(payload[2].status).toBe("RESERVED");
    });

    it("TC-17: Cross-tenant isolation - tenant A nao consegue consultar assentos da sessao do tenant B", async () => {
      // Requisicao autenticada como tenant A
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      // Sessao pertence a outro tenant (tenant B), portanto findFirst com where { tenantId } retorna null
      vi.mocked(rawPrisma.session.findFirst).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/sessoes/${sessionId}/assentos`);
      const response = await getSessionSeats(request, { params: { id: sessionId } });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toContain("Sessao nao encontrada");

      // Garante que a busca de assentos sequer foi disparada
      expect(rawPrisma.sessionSeat.findMany).not.toHaveBeenCalled();
    });

    it("TC-19: Requisicao sem contexto de tenant retorna HTTP 401 Unauthorized", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/sessoes/${sessionId}/assentos`);
      const response = await getSessionSeats(request, { params: { id: sessionId } });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toContain("Contexto de tenant nao identificado");
    });

    it("permite acesso operacional ao Atendente, Gerente e Cliente (AC-2 / TC-17)", async () => {
      const allowedRoles = ["ATENDENTE", "GERENTE", "CLIENTE"];

      for (const role of allowedRoles) {
        vi.mocked(getServerSession).mockResolvedValue({
          user: { id: "user-1", role, tenantId },
        } as any);

        vi.mocked(rawPrisma.session.findFirst).mockResolvedValue({
          id: sessionId,
          price: 35.0,
          status: "SCHEDULED",
        } as any);
        vi.mocked(rawPrisma.sessionSeat.findMany).mockResolvedValue([]);

        const request = new NextRequest(`http://localhost:3000/api/sessoes/${sessionId}/assentos`);
        const response = await getSessionSeats(request, { params: { id: sessionId } });
        expect(response.status).toBe(200);
      }
    });

    it("benchmark de latencia: endpoint responde em menos de 100ms", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.session.findFirst).mockResolvedValue({
        id: sessionId,
        price: 35.0,
      } as any);

      const largeSeatArray = Array.from({ length: 120 }, (_, idx) => ({
        id: `ss-${idx}`,
        seatId: `seat-${idx}`,
        status: "AVAILABLE",
        seat: { rowLabel: "A", columnNumber: idx + 1, seatCode: `A${idx + 1}` },
      }));

      vi.mocked(rawPrisma.sessionSeat.findMany).mockResolvedValue(largeSeatArray as any);

      const request = new NextRequest(`http://localhost:3000/api/sessoes/${sessionId}/assentos`);

      const start = performance.now();
      const response = await getSessionSeats(request, { params: { id: sessionId } });
      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
    });
  });
});
