import { rawPrisma } from "@/shared/db/prisma";
import { type CreateSessionInput, type UpdateSessionInput } from "./session-schema";
import { SessionStatus } from "@prisma/client";

export class SessionNotFoundError extends Error {
  constructor(message = "Sessao nao encontrada neste cinema.") {
    super(message);
    this.name = "SessionNotFoundError";
  }
}

export class SessionFilmNotFoundError extends Error {
  constructor(message = "Filme informado nao encontrado neste cinema.") {
    super(message);
    this.name = "SessionFilmNotFoundError";
  }
}

export class SessionRoomNotFoundError extends Error {
  constructor(message = "Sala informada nao encontrada neste cinema.") {
    super(message);
    this.name = "SessionRoomNotFoundError";
  }
}

export class SessionScheduleConflictError extends Error {
  constructor(message = "Conflito de horario: a sala informada ja possui outra sessao agendada neste intervalo.") {
    super(message);
    this.name = "SessionScheduleConflictError";
  }
}

export class SessionHasTicketsError extends Error {
  constructor(message = "Nao e possivel excluir a sessao pois ja existem ingressos vendidos ou reservas ativas.") {
    super(message);
    this.name = "SessionHasTicketsError";
  }
}

/**
 * Cria sessao cinematografica com verificacao de conflito de horario e pre-populacao atomica (ADR-007)
 */
export async function createSession(input: CreateSessionInput, tenantId: string) {
  // 1. Validar existencia do Filme
  const film = await rawPrisma.film.findFirst({
    where: { id: input.filmId, tenantId },
  });
  if (!film) {
    throw new SessionFilmNotFoundError();
  }

  // 2. Validar existencia da Sala
  const room = await rawPrisma.room.findFirst({
    where: { id: input.roomId, tenantId },
  });
  if (!room) {
    throw new SessionRoomNotFoundError();
  }

  // 3. Verificacao de colisão de horarios
  const newStart = input.startsAt instanceof Date ? input.startsAt : new Date(input.startsAt);
  const newEnd = new Date(newStart.getTime() + film.durationMinutes * 60 * 1000);

  const existingSessions = await rawPrisma.session.findMany({
    where: {
      roomId: input.roomId,
      tenantId,
      status: { not: SessionStatus.CANCELLED },
    },
    include: {
      film: {
        select: { durationMinutes: true },
      },
    },
  });

  for (const existing of existingSessions) {
    const existStart = new Date(existing.startsAt);
    const existEnd = new Date(existStart.getTime() + existing.film.durationMinutes * 60 * 1000);

    // Conflito ocorre se [newStart, newEnd] sobrepor [existStart, existEnd]
    const overlaps = newStart < existEnd && newEnd > existStart;
    if (overlaps) {
      throw new SessionScheduleConflictError();
    }
  }

  // 4. Criacao transacional da sessao e pre-populacao de SessionSeat (ADR-007)
  return rawPrisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        tenantId,
        filmId: input.filmId,
        roomId: input.roomId,
        startsAt: newStart,
        price: input.price,
        status: input.status ?? SessionStatus.SCHEDULED,
      },
      include: {
        film: true,
        room: true,
      },
    });

    // Busca assentos fisicos da sala
    const physicalSeats = await tx.seat.findMany({
      where: { roomId: input.roomId, tenantId },
    });

    if (physicalSeats.length > 0) {
      await tx.sessionSeat.createMany({
        data: physicalSeats.map((seat) => ({
          sessionId: session.id,
          seatId: seat.id,
          tenantId,
          status: "AVAILABLE",
        })),
      });
    }

    return {
      ...session,
      seatsGeneratedCount: physicalSeats.length,
    };
  });
}

/**
 * Lista sessoes cinematograficas do tenant com filtros opcionais
 */
export async function listSessions(
  tenantId: string,
  options?: {
    filmId?: string;
    roomId?: string;
    date?: string;
    status?: SessionStatus;
  }
) {
  const where: any = { tenantId };

  if (options?.filmId) {
    where.filmId = options.filmId;
  }
  if (options?.roomId) {
    where.roomId = options.roomId;
  }
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.date) {
    const startOfDay = new Date(`${options.date}T00:00:00.000Z`);
    const endOfDay = new Date(`${options.date}T23:59:59.999Z`);
    where.startsAt = { gte: startOfDay, lte: endOfDay };
  }

  return rawPrisma.session.findMany({
    where,
    include: {
      film: {
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          rating: true,
          posterUrl: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          capacity: true,
        },
      },
      _count: {
        select: {
          sessionSeats: true,
          tickets: true,
          reservations: true,
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

/**
 * Busca detalhes completos da sessao e o mapa de assentos pre-populados
 */
export async function getSessionById(id: string, tenantId: string) {
  const session = await rawPrisma.session.findFirst({
    where: { id, tenantId },
    include: {
      film: true,
      room: true,
      sessionSeats: {
        include: {
          seat: true,
        },
        orderBy: [
          { seat: { rowLabel: "asc" } },
          { seat: { columnNumber: "asc" } },
        ],
      },
      _count: {
        select: {
          tickets: true,
          reservations: true,
        },
      },
    },
  });

  if (!session) {
    throw new SessionNotFoundError();
  }

  return session;
}

/**
 * Atualiza status ou campos permitidos da sessao
 */
export async function updateSession(
  id: string,
  input: UpdateSessionInput,
  tenantId: string
) {
  const session = await rawPrisma.session.findFirst({
    where: { id, tenantId },
  });

  if (!session) {
    throw new SessionNotFoundError();
  }

  const updateData: any = {};
  if (input.price !== undefined) {
    updateData.price = input.price;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.startsAt !== undefined) {
    updateData.startsAt = input.startsAt instanceof Date ? input.startsAt : new Date(input.startsAt);
  }

  return rawPrisma.session.update({
    where: { id },
    data: updateData,
    include: {
      film: true,
      room: true,
    },
  });
}

/**
 * Exclui sessao desde que nao possua ingressos vendidos ou reservas
 */
export async function deleteSession(id: string, tenantId: string) {
  const session = await rawPrisma.session.findFirst({
    where: { id, tenantId },
    include: {
      _count: {
        select: {
          tickets: true,
          reservations: true,
        },
      },
    },
  });

  if (!session) {
    throw new SessionNotFoundError();
  }

  if (session._count.tickets > 0 || session._count.reservations > 0) {
    throw new SessionHasTicketsError();
  }

  return rawPrisma.$transaction(async (tx) => {
    await tx.sessionSeat.deleteMany({
      where: { sessionId: id, tenantId },
    });

    return tx.session.delete({
      where: { id },
    });
  });
}

export const SessionService = {
  createSession,
  listSessions,
  getSessionById,
  updateSession,
  deleteSession,
};
