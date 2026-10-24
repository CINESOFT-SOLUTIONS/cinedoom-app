import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createReservationRoute } from "@/app/api/portal/reservas/route";
import { GET as getReservationByIdRoute } from "@/app/api/portal/reservas/[id]/route";
import { GET as getSessionByIdRoute } from "@/app/api/portal/sessoes/[id]/route";
import { PortalService, ReservationAntecedenceError, SeatNotAvailableError } from "@/modules/portal";

vi.mock("@/shared/db/prisma", () => {
  const mockTx = {
    session: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
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
    reservation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  return {
    rawPrisma: {
      $transaction: vi.fn((callback) => callback(mockTx)),
      session: mockTx.session,
      sessionSeat: mockTx.sessionSeat,
      buyer: mockTx.buyer,
      reservation: mockTx.reservation,
      mockTx,
    },
  };
});

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Portal do Cliente - Reserva Atomica e Catalogo (TASK-21 / AC-9 / AC-14 / RF-12 / RF-13 / RF-18 / ADR-012)", () => {
  const tenantId = "11111111-1111-4111-a111-111111111111";
  const userId = "22222222-2222-4222-a222-222222222222";
  const sessionId = "33333333-3333-4333-a333-333333333333";
  const seatId1 = "44444444-4444-4444-a444-444444444441";
  const seatId2 = "44444444-4444-4444-a444-444444444442";

  // CPF matematicamente valido no algoritmo oficial brasileiro
  const validCpf = "529.982.247-25";

  // Sessao com inicio em 2 horas no futuro (> 60 minutos)
  const sessionStartsAt2HoursFuture = new Date(Date.now() + 2 * 60 * 60 * 1000);

  // Sessao com inicio em 30 minutos no futuro (< 60 minutos)
  const sessionStartsAt30MinFuture = new Date(Date.now() + 30 * 60 * 1000);

  const validPayload = {
    sessionId,
    sessionSeatIds: [seatId2, seatId1],
    buyer: {
      name: "Maria Luiza Oliveira",
      cpf: validCpf,
      email: "maria.luiza@email.com",
      lgpdConsent: true,
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { rawPrisma } = await import("@/shared/db/prisma");
    const mockTx = (rawPrisma as any).mockTx;

    mockTx.session.findFirst.mockResolvedValue({
      id: sessionId,
      tenantId,
      price: 32.5,
      status: "OPEN",
      startsAt: sessionStartsAt2HoursFuture,
      film: { title: "Duna: Parte 2" },
      room: { name: "Sala IMAX 1" },
    });

    mockTx.session.findUnique.mockResolvedValue({
      id: sessionId,
      tenantId,
      price: 32.5,
      status: "OPEN",
      startsAt: sessionStartsAt2HoursFuture,
      film: {
        id: "film-1",
        title: "Duna: Parte 2",
        synopsis: "Jornada épica de Paul Atreides.",
        durationMinutes: 166,
        rating: "14",
        director: "Denis Villeneuve",
        posterUrl: "https://cinedoom.com/posters/duna2.jpg",
      },
      room: {
        id: "room-1",
        name: "Sala IMAX 1",
        capacity: 120,
      },
      tenant: {
        id: tenantId,
        name: "CineDoom Prime",
      },
    });

    mockTx.$queryRaw.mockResolvedValue([
      { id: seatId1, status: "AVAILABLE", seat_id: "phys-seat-1", reservation_id: null, reservation_expires_at: null },
      { id: seatId2, status: "AVAILABLE", seat_id: "phys-seat-2", reservation_id: null, reservation_expires_at: null },
    ]);

    mockTx.reservation.findUnique.mockResolvedValue(null);

    mockTx.buyer.findFirst.mockResolvedValue(null);
    mockTx.buyer.create.mockResolvedValue({
      id: "buyer-uuid-1234",
      tenantId,
      name: validPayload.buyer.name,
      email: validPayload.buyer.email,
    });

    mockTx.reservation.create.mockImplementation((args: any) => ({
      id: "res-uuid-9876",
      ...args.data,
      totalPrice: args.data.totalPrice,
      createdAt: new Date(),
    }));

    mockTx.sessionSeat.updateMany.mockResolvedValue({ count: 2 });
  });

  describe("AC-9: Solicitacao de reserva com trava atomica ACID e geracao de codigo unico", () => {
    it("deve criar reserva com status PENDING, vincular reservation_id e atualizar assentos para RESERVED", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      const result = await PortalService.createReservation(validPayload, tenantId);

      expect(result.success).toBe(true);
      expect(result.reservation).toBeDefined();
      expect(result.reservation.status).toBe("PENDING");
      expect(result.reservation.code).toMatch(/^CD-\d{4}$/);
      expect(result.reservation.totalPrice).toBe(65.0); // 2 assentos * 32.50
      expect(result.reservation.seatCount).toBe(2);
      expect(result.reservation.buyer.name).toBe("Maria Luiza Oliveira");

      // AC-9: reservation_expires_at = starts_at - 1h
      const expectedExpiresAtMs = sessionStartsAt2HoursFuture.getTime() - 60 * 60 * 1000;
      expect(new Date(result.reservation.expiresAt).getTime()).toBe(expectedExpiresAtMs);

      // Verifica chamada a updateMany atualizando assentos para RESERVED com o reservationId
      expect(mockTx.sessionSeat.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [seatId1, seatId2] },
          sessionId,
          tenantId,
        },
        data: {
          status: "RESERVED",
          reservationId: "res-uuid-9876",
          reservationExpiresAt: expect.any(Date),
        },
      });
    });

    it("deve persistir comprador com hash HMAC-SHA256 e cifra AES-256-GCM conforme LGPD", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      await PortalService.createReservation(validPayload, tenantId);

      expect(mockTx.buyer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: "Maria Luiza Oliveira",
          email: "maria.luiza@email.com",
          cpfHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          cpfEncrypted: expect.any(String),
          lgpdConsentAt: expect.any(Date),
        }),
      });
    });
  });

  describe("AC-14: Rejeicao de reserva online se faltar menos de 60 minutos para a sessao", () => {
    it("deve lancar ReservationAntecedenceError se faltar menos de 60 minutos para o inicio", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      mockTx.session.findFirst.mockResolvedValue({
        id: sessionId,
        tenantId,
        price: 32.5,
        status: "OPEN",
        startsAt: sessionStartsAt30MinFuture, // 30 min no futuro
        film: { title: "Duna: Parte 2" },
        room: { name: "Sala IMAX 1" },
      });

      await expect(
        PortalService.createReservation(validPayload, tenantId)
      ).rejects.toThrow(ReservationAntecedenceError);
    });

    it("deve responder com HTTP 422 e codigo ANTECEDENCE_VIOLATION no Route Handler", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      mockTx.session.findFirst.mockResolvedValue({
        id: sessionId,
        tenantId,
        price: 32.5,
        status: "OPEN",
        startsAt: sessionStartsAt30MinFuture,
        film: { title: "Duna: Parte 2" },
        room: { name: "Sala IMAX 1" },
      });

      const request = new NextRequest("http://localhost:3000/api/portal/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify(validPayload),
      });

      const response = await createReservationRoute(request);
      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.code).toBe("ANTECEDENCE_VIOLATION");
      expect(body.error).toContain("antecedencia minima de 60 minutos");
    });
  });

  describe("Conflito de Concorrencia e Bloqueio (AC-1 / AC-9 / ADR-007)", () => {
    it("deve rejeitar com SeatNotAvailableError (HTTP 409) se assento ja estiver SOLD", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      mockTx.$queryRaw.mockResolvedValue([
        { id: seatId1, status: "SOLD", seat_id: "phys-seat-1", reservation_id: null, reservation_expires_at: null },
        { id: seatId2, status: "AVAILABLE", seat_id: "phys-seat-2", reservation_id: null, reservation_expires_at: null },
      ]);

      const request = new NextRequest("http://localhost:3000/api/portal/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify(validPayload),
      });

      const response = await createReservationRoute(request);
      expect(response.status).toBe(409);

      const body = await response.json();
      expect(body.code).toBe("SEAT_NOT_AVAILABLE");
    });

    it("deve rejeitar com SeatNotAvailableError (HTTP 409) se assento ja estiver RESERVED com expiracao futura", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      const futureExpiration = new Date(Date.now() + 45 * 60 * 1000);
      mockTx.$queryRaw.mockResolvedValue([
        { id: seatId1, status: "RESERVED", seat_id: "phys-seat-1", reservation_id: "other-res", reservation_expires_at: futureExpiration },
        { id: seatId2, status: "AVAILABLE", seat_id: "phys-seat-2", reservation_id: null, reservation_expires_at: null },
      ]);

      const request = new NextRequest("http://localhost:3000/api/portal/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify(validPayload),
      });

      const response = await createReservationRoute(request);
      expect(response.status).toBe(409);
    });

    it("deve rejeitar com HTTP 409 se a sessao estiver CANCELLED", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      mockTx.session.findFirst.mockResolvedValue({
        id: sessionId,
        tenantId,
        price: 32.5,
        status: "CANCELLED",
        startsAt: sessionStartsAt2HoursFuture,
        film: { title: "Duna: Parte 2" },
        room: { name: "Sala IMAX 1" },
      });

      const request = new NextRequest("http://localhost:3000/api/portal/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify(validPayload),
      });

      const response = await createReservationRoute(request);
      expect(response.status).toBe(409);
    });
  });

  describe("Expiração Just-in-Time (AC-14 / ADR-012)", () => {
    it("deve permitir reserva se o assento estava RESERVED mas o prazo de expiracao ja passou (JIT Expiration)", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      // Expiracao ocorrida 10 minutos atras
      const pastExpiration = new Date(Date.now() - 10 * 60 * 1000);

      mockTx.$queryRaw.mockResolvedValue([
        { id: seatId1, status: "RESERVED", seat_id: "phys-seat-1", reservation_id: "expired-res", reservation_expires_at: pastExpiration },
        { id: seatId2, status: "AVAILABLE", seat_id: "phys-seat-2", reservation_id: null, reservation_expires_at: null },
      ]);

      const result = await PortalService.createReservation(validPayload, tenantId);

      expect(result.success).toBe(true);
      expect(result.reservation.status).toBe("PENDING");
      expect(mockTx.sessionSeat.updateMany).toHaveBeenCalled();
    });
  });

  describe("Validacao de Dados de Entrada e Seguranca", () => {
    it("deve rejeitar se o CPF informado for matematicamente invalido (422)", async () => {
      const invalidPayload = {
        ...validPayload,
        buyer: {
          ...validPayload.buyer,
          cpf: "111.111.111-11", // Digitos verificadores invalidos
        },
      };

      const request = new NextRequest("http://localhost:3000/api/portal/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify(invalidPayload),
      });

      const response = await createReservationRoute(request);
      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.error).toContain("CPF informado e invalido");
    });

    it("deve rejeitar com 401 se nao houver tenant_id na requisicao", async () => {
      const request = new NextRequest("http://localhost:3000/api/portal/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validPayload),
      });

      const response = await createReservationRoute(request);
      expect(response.status).toBe(401);
    });
  });

  describe("Consulta de Comprovante de Reserva (GET /api/portal/reservas/[id])", () => {
    it("deve retornar comprovante completo com codigo, assentos e instrucoes de pagamento", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      mockTx.reservation.findFirst.mockResolvedValue({
        id: "res-uuid-9876",
        code: "CD-8942",
        sessionId,
        status: "PENDING",
        totalPrice: 65.0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
        buyerName: "Maria Luiza Oliveira",
        buyerEmail: "maria.luiza@email.com",
        session: {
          startsAt: sessionStartsAt2HoursFuture,
          price: 32.5,
          film: {
            title: "Duna: Parte 2",
            posterUrl: "https://cinedoom.com/posters/duna2.jpg",
            rating: "14",
            durationMinutes: 166,
          },
          room: {
            name: "Sala IMAX 1",
          },
        },
        sessionSeats: [
          { id: seatId1, seat: { rowLabel: "A", columnNumber: 1, seatCode: "A1" } },
          { id: seatId2, seat: { rowLabel: "A", columnNumber: 2, seatCode: "A2" } },
        ],
        buyer: null,
      });

      const request = new NextRequest("http://localhost:3000/api/portal/reservas/res-uuid-9876", {
        headers: { "x-tenant-id": tenantId },
      });

      const response = await getReservationByIdRoute(request, { params: { id: "res-uuid-9876" } });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.code).toBe("CD-8942");
      expect(body.seats.length).toBe(2);
      expect(body.instructions).toContain("bilheteria fisica");
    });
  });

  describe("Consulta Publica de Sessao (GET /api/portal/sessoes/[id])", () => {
    it("deve retornar canReserveOnline: true quando a sessao inicia em mais de 60 minutos", async () => {
      const request = new NextRequest(`http://localhost:3000/api/portal/sessoes/${sessionId}?tenantId=${tenantId}`);
      const response = await getSessionByIdRoute(request, { params: { id: sessionId } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.canReserveOnline).toBe(true);
      expect(body.minutesUntilSession).toBeGreaterThanOrEqual(60);
    });

    it("deve retornar canReserveOnline: false quando a sessao inicia em menos de 60 minutos", async () => {
      const { rawPrisma } = await import("@/shared/db/prisma");
      const mockTx = (rawPrisma as any).mockTx;

      mockTx.session.findUnique.mockResolvedValue({
        id: sessionId,
        tenantId,
        price: 32.5,
        status: "OPEN",
        startsAt: sessionStartsAt30MinFuture, // 30 min
        film: {
          id: "film-1",
          title: "Duna: Parte 2",
          synopsis: "Jornada épica de Paul Atreides.",
          durationMinutes: 166,
          rating: "14",
          director: "Denis Villeneuve",
          posterUrl: "https://cinedoom.com/posters/duna2.jpg",
        },
        room: {
          id: "room-1",
          name: "Sala IMAX 1",
          capacity: 120,
        },
        tenant: {
          id: tenantId,
          name: "CineDoom Prime",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/portal/sessoes/${sessionId}?tenantId=${tenantId}`);
      const response = await getSessionByIdRoute(request, { params: { id: sessionId } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.canReserveOnline).toBe(false);
      expect(body.minutesUntilSession).toBeLessThan(60);
    });
  });
});
