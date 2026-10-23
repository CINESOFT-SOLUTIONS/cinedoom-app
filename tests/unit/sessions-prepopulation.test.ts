import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSessionSchema,
  updateSessionSchema,
  formatZodErrors,
  SessionService,
  SessionNotFoundError,
  SessionFilmNotFoundError,
  SessionRoomNotFoundError,
  SessionScheduleConflictError,
  SessionHasTicketsError,
} from "@/modules/backoffice";
import { rawPrisma } from "@/shared/db/prisma";
import { NextRequest } from "next/server";
import { GET as getSessoes, POST as postSessoes } from "@/app/api/sessoes/route";
import { GET as getSessionById, DELETE as deleteSessionRoute } from "@/app/api/sessoes/[id]/route";
import { getServerSession } from "next-auth";

// Mock do prisma
vi.mock("@/shared/db/prisma", () => {
  const mockFilm = {
    findFirst: vi.fn(),
  };

  const mockRoom = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };

  const mockSeat = {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockSession = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockSessionSeat = {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockTx = {
    session: mockSession,
    seat: mockSeat,
    sessionSeat: mockSessionSeat,
  };

  return {
    rawPrisma: {
      film: mockFilm,
      room: mockRoom,
      seat: mockSeat,
      session: mockSession,
      sessionSeat: mockSessionSeat,
      $transaction: vi.fn(async (cb: any) => cb(mockTx)),
    },
  };
});

// Mock do next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Módulo de Sessões & Pré-população de SessionSeat (TASK-8 / ADR-007 / AC-5 / AC-8 / TC-8 / TC-13)", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const validFilmId = "22222222-2222-2222-2222-222222222222";
  const validRoomId = "33333333-3333-3333-3333-333333333333";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validação com Zod (createSessionSchema & updateSessionSchema)", () => {
    it("valida com sucesso payload completo em camelCase", () => {
      const payload = {
        filmId: validFilmId,
        roomId: validRoomId,
        startsAt: "2026-11-05T19:00:00.000Z",
        price: 45.5,
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filmId).toBe(validFilmId);
        expect(result.data.roomId).toBe(validRoomId);
        expect(result.data.price).toBe(45.5);
        expect(result.data.startsAt).toBeInstanceOf(Date);
      }
    });

    it("suporta interoperabilidade com snake_case (film_id, room_id, starts_at)", () => {
      const payload = {
        film_id: validFilmId,
        room_id: validRoomId,
        starts_at: "2026-11-05T21:30:00.000Z",
        price: "35.00",
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filmId).toBe(validFilmId);
        expect(result.data.roomId).toBe(validRoomId);
        expect(result.data.price).toBe(35);
      }
    });

    it("rejeita quando filmId não for um UUID válido", () => {
      const payload = {
        filmId: "filme-invalido-nao-uuid",
        roomId: validRoomId,
        startsAt: "2026-11-05T19:00:00.000Z",
        price: 30,
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some((e) => e.field === "filmId")).toBe(true);
      }
    });

    it("rejeita quando o preço for negativo ou zero", () => {
      const payloadZero = {
        filmId: validFilmId,
        roomId: validRoomId,
        startsAt: "2026-11-05T19:00:00.000Z",
        price: 0,
      };

      const result = createSessionSchema.safeParse(payloadZero);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some((e) => e.field === "price")).toBe(true);
      }
    });

    it("rejeita quando a data de início for inválida", () => {
      const payload = {
        filmId: validFilmId,
        roomId: validRoomId,
        startsAt: "data-completamente-invalida",
        price: 40,
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some((e) => e.field === "startsAt")).toBe(true);
      }
    });
  });

  describe("SessionService (Detecção de Conflito de Horário & Pré-população ADR-007)", () => {
    it("lança SessionFilmNotFoundError se o filme não pertencer ao tenant", async () => {
      vi.mocked(rawPrisma.film.findFirst).mockResolvedValue(null);

      await expect(
        SessionService.createSession(
          {
            filmId: validFilmId,
            roomId: validRoomId,
            startsAt: new Date("2026-11-05T19:00:00.000Z"),
            price: 35,
          } as any,
          tenantId
        )
      ).rejects.toThrow(SessionFilmNotFoundError);
    });

    it("lança SessionRoomNotFoundError se a sala não pertencer ao tenant", async () => {
      vi.mocked(rawPrisma.film.findFirst).mockResolvedValue({
        id: validFilmId,
        durationMinutes: 120,
      } as any);
      vi.mocked(rawPrisma.room.findFirst).mockResolvedValue(null);

      await expect(
        SessionService.createSession(
          {
            filmId: validFilmId,
            roomId: validRoomId,
            startsAt: new Date("2026-11-05T19:00:00.000Z"),
            price: 35,
          } as any,
          tenantId
        )
      ).rejects.toThrow(SessionRoomNotFoundError);
    });

    it("lança SessionScheduleConflictError quando houver sobreposição de horário na mesma sala", async () => {
      vi.mocked(rawPrisma.film.findFirst).mockResolvedValue({
        id: validFilmId,
        durationMinutes: 120, // 2 horas (19:00 ate 21:00)
      } as any);
      vi.mocked(rawPrisma.room.findFirst).mockResolvedValue({
        id: validRoomId,
        name: "Sala IMAX",
      } as any);

      // Sessao existente das 20:00 ate 22:00 (colide com 19:00 - 21:00)
      vi.mocked(rawPrisma.session.findMany).mockResolvedValue([
        {
          id: "sess-existente-1",
          startsAt: new Date("2026-11-05T20:00:00.000Z"),
          film: { durationMinutes: 120 },
        },
      ] as any);

      await expect(
        SessionService.createSession(
          {
            filmId: validFilmId,
            roomId: validRoomId,
            startsAt: new Date("2026-11-05T19:00:00.000Z"),
            price: 35,
          } as any,
          tenantId
        )
      ).rejects.toThrow(SessionScheduleConflictError);
    });

    it("ADR-007: cria sessão e pré-popula exatamente N SessionSeat com status AVAILABLE para cada assento físico da sala", async () => {
      vi.mocked(rawPrisma.film.findFirst).mockResolvedValue({
        id: validFilmId,
        durationMinutes: 100,
      } as any);
      vi.mocked(rawPrisma.room.findFirst).mockResolvedValue({
        id: validRoomId,
        name: "Sala Principal",
      } as any);
      vi.mocked(rawPrisma.session.findMany).mockResolvedValue([]); // sem conflito

      const mockCreatedSession = {
        id: "session-uuid-123",
        tenantId,
        filmId: validFilmId,
        roomId: validRoomId,
        startsAt: new Date("2026-11-05T19:00:00.000Z"),
        price: 40,
        status: "SCHEDULED",
      };

      // Mock de 5 assentos fisicos na sala
      const mockSeats = [
        { id: "seat-1", roomId: validRoomId, rowLabel: "A", columnNumber: 1 },
        { id: "seat-2", roomId: validRoomId, rowLabel: "A", columnNumber: 2 },
        { id: "seat-3", roomId: validRoomId, rowLabel: "A", columnNumber: 3 },
        { id: "seat-4", roomId: validRoomId, rowLabel: "B", columnNumber: 1 },
        { id: "seat-5", roomId: validRoomId, rowLabel: "B", columnNumber: 2 },
      ];

      vi.mocked(rawPrisma.session.create).mockResolvedValue(mockCreatedSession as any);
      vi.mocked(rawPrisma.seat.findMany).mockResolvedValue(mockSeats as any);

      const result = await SessionService.createSession(
        {
          filmId: validFilmId,
          roomId: validRoomId,
          startsAt: new Date("2026-11-05T19:00:00.000Z"),
          price: 40,
        } as any,
        tenantId
      );

      expect(result.id).toBe("session-uuid-123");
      expect(result.seatsGeneratedCount).toBe(5);

      // Valida que tx.sessionSeat.createMany foi chamado com todos os 5 assentos AVAILABLE
      expect(rawPrisma.sessionSeat.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          {
            sessionId: "session-uuid-123",
            seatId: "seat-1",
            tenantId,
            status: "AVAILABLE",
          },
          {
            sessionId: "session-uuid-123",
            seatId: "seat-5",
            tenantId,
            status: "AVAILABLE",
          },
        ]),
      });
    });

    it("deleteSession lança SessionHasTicketsError se houver ingressos ou reservas vinculadas", async () => {
      vi.mocked(rawPrisma.session.findFirst).mockResolvedValue({
        id: "sess-1",
        tenantId,
        _count: {
          tickets: 2,
          reservations: 0,
        },
      } as any);

      await expect(SessionService.deleteSession("sess-1", tenantId)).rejects.toThrow(
        SessionHasTicketsError
      );
      expect(rawPrisma.session.delete).not.toHaveBeenCalled();
    });
  });

  describe("Route Handlers /api/sessoes (RBAC & Status Codes)", () => {
    it("TC-5 / TC-13 / AC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar POST /api/sessoes", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/sessoes", {
        method: "POST",
        body: JSON.stringify({
          filmId: validFilmId,
          roomId: validRoomId,
          startsAt: "2026-11-05T19:00:00.000Z",
          price: 35,
        }),
      });

      const response = await postSessoes(request);
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
      expect(rawPrisma.session.create).not.toHaveBeenCalled();
    });

    it("TC-5 / TC-13 / AC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar GET /api/sessoes", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/sessoes", {
        method: "GET",
      });

      const response = await getSessoes(request);
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
    });

    it("TC-16: POST /api/sessoes retorna HTTP 422 quando campos obrigatórios estiverem ausentes", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/sessoes", {
        method: "POST",
        body: JSON.stringify({
          filmId: validFilmId,
          // Faltam roomId, startsAt e price
        }),
      });

      const response = await postSessoes(request);
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.errors).toBeDefined();
      expect(Array.isArray(json.errors)).toBe(true);
      expect(json.errors.some((e: any) => e.field === "roomId")).toBe(true);
    });

    it("retorna HTTP 409 Conflict quando ocorre sobreposição de horário na mesma sala", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.film.findFirst).mockResolvedValue({
        id: validFilmId,
        durationMinutes: 120,
      } as any);
      vi.mocked(rawPrisma.room.findFirst).mockResolvedValue({
        id: validRoomId,
        name: "Sala 1",
      } as any);

      vi.mocked(rawPrisma.session.findMany).mockResolvedValue([
        {
          id: "s1",
          startsAt: new Date("2026-11-05T19:00:00.000Z"),
          film: { durationMinutes: 120 },
        },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/sessoes", {
        method: "POST",
        body: JSON.stringify({
          filmId: validFilmId,
          roomId: validRoomId,
          startsAt: "2026-11-05T19:30:00.000Z", // Conflito direto
          price: 35,
        }),
      });

      const response = await postSessoes(request);
      expect(response.status).toBe(409);

      const json = await response.json();
      expect(json.error).toContain("Conflito de horario");
    });

    it("TC-8: GERENTE com dados válidos recebe HTTP 201 Created com a sessão e assentos pré-inseridos", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.film.findFirst).mockResolvedValue({
        id: validFilmId,
        durationMinutes: 120,
      } as any);
      vi.mocked(rawPrisma.room.findFirst).mockResolvedValue({
        id: validRoomId,
        name: "Sala 1",
      } as any);
      vi.mocked(rawPrisma.session.findMany).mockResolvedValue([]); // sem conflito

      vi.mocked(rawPrisma.session.create).mockResolvedValue({
        id: "sess-nova-999",
        filmId: validFilmId,
        roomId: validRoomId,
        startsAt: new Date("2026-11-05T20:00:00.000Z"),
        price: 35,
        status: "SCHEDULED",
        tenantId,
      } as any);

      vi.mocked(rawPrisma.seat.findMany).mockResolvedValue([
        { id: "st-1" },
        { id: "st-2" },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/sessoes", {
        method: "POST",
        body: JSON.stringify({
          filmId: validFilmId,
          roomId: validRoomId,
          startsAt: "2026-11-05T20:00:00.000Z",
          price: 35,
        }),
      });

      const response = await postSessoes(request);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.id).toBe("sess-nova-999");
      expect(json.seatsGeneratedCount).toBe(2);
    });

    it("TC-5 / TC-13: ATENDENTE recebe HTTP 403 ao tentar GET /api/sessoes/[id]", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/sessoes/sess-123", {
        method: "GET",
      });

      const response = await getSessionById(request, { params: { id: "sess-123" } });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
    });

    it("TC-5 / TC-13: ATENDENTE recebe HTTP 403 ao tentar DELETE /api/sessoes/[id]", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/sessoes/sess-123", {
        method: "DELETE",
      });

      const response = await deleteSessionRoute(request, { params: { id: "sess-123" } });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
    });
  });
});
