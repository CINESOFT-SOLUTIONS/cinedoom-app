import { rawPrisma } from "@/shared/db/prisma";
import { SessionStatus } from "@prisma/client";
import type {
  ISessionRepository,
  SessionWithRelations,
  ListSessionsFilter,
} from "../domain/session-repository.interface";
import type { CreateSessionInput } from "../application/session.schema";

/**
 * Implementacao concreta do ISessionRepository baseada em Prisma Client e Transacoes ACID
 */
export class PrismaSessionRepository implements ISessionRepository {
  async findMany(
    tenantId: string,
    filter?: ListSessionsFilter
  ): Promise<SessionWithRelations[]> {
    const where: any = { tenantId };

    if (filter?.filmId) {
      where.filmId = filter.filmId;
    }
    if (filter?.roomId) {
      where.roomId = filter.roomId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.date) {
      const startOfDay = new Date(filter.date + "T00:00:00.000Z");
      const endOfDay = new Date(filter.date + "T23:59:59.999Z");
      where.startsAt = { gte: startOfDay, lte: endOfDay };
    }

    const sessions = await rawPrisma.session.findMany({
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

    return sessions as unknown as SessionWithRelations[];
  }

  async findById(id: string, tenantId: string): Promise<SessionWithRelations | null> {
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

    return (session as unknown as SessionWithRelations) || null;
  }

  async findConflicting(
    roomId: string,
    tenantId: string
  ): Promise<{ startsAt: Date; film: { durationMinutes: number } }[]> {
    const sessions = await rawPrisma.session.findMany({
      where: {
        roomId,
        tenantId,
        status: { not: SessionStatus.CANCELLED },
      },
      include: {
        film: {
          select: { durationMinutes: true },
        },
      },
    });

    return sessions.map((s) => ({
      startsAt: s.startsAt,
      film: { durationMinutes: s.film.durationMinutes },
    }));
  }

  async createWithPrepopulatedSeats(
    tenantId: string,
    input: CreateSessionInput,
    startsAt: Date
  ): Promise<SessionWithRelations> {
    return rawPrisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          tenantId,
          filmId: input.filmId,
          roomId: input.roomId,
          startsAt,
          price: input.price,
          status: input.status ?? SessionStatus.SCHEDULED,
        },
        include: {
          film: true,
          room: true,
        },
      });

      const physicalSeats = await tx.seat.findMany({
        where: { roomId: input.roomId, tenantId },
      });

      if (physicalSeats.length > 0) {
        await tx.sessionSeat.createMany({
          data: physicalSeats.map((seat: any) => ({
            sessionId: session.id,
            seatId: seat.id,
            tenantId,
            status:
              seat.status === "BLOCKED" || seat.status === "MAINTENANCE"
                ? "BLOCKED"
                : "AVAILABLE",
          })),
        });
      }

      return {
        ...session,
        seatsGeneratedCount: physicalSeats.length,
      } as unknown as SessionWithRelations;
    });
  }

  async update(id: string, data: any): Promise<SessionWithRelations> {
    const session = await rawPrisma.session.update({
      where: { id },
      data,
      include: {
        film: true,
        room: true,
      },
    });

    return session as unknown as SessionWithRelations;
  }

  async deleteWithSeats(id: string, tenantId: string): Promise<SessionWithRelations> {
    return rawPrisma.$transaction(async (tx) => {
      await tx.sessionSeat.deleteMany({
        where: { sessionId: id, tenantId },
      });

      const deletedSession = await tx.session.delete({
        where: { id },
      });

      return deletedSession as unknown as SessionWithRelations;
    });
  }
}

export const defaultSessionRepository = new PrismaSessionRepository();
