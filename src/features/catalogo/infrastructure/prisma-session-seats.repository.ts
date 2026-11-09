import { rawPrisma } from "@/shared/db/prisma";
import type { ISessionSeatsRepository } from "../domain/session-seats-repository.interface";

export class PrismaSessionSeatsRepository implements ISessionSeatsRepository {
  async findSessionPriceAndStatus(sessionId: string, tenantId: string) {
    return rawPrisma.session.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, price: true, status: true, roomId: true },
    });
  }

  async findSessionSeats(sessionId: string, tenantId: string) {
    return rawPrisma.sessionSeat.findMany({
      where: { sessionId, tenantId },
      select: {
        id: true,
        seatId: true,
        status: true,
        reservationExpiresAt: true,
        seat: {
          select: { rowLabel: true, columnNumber: true, seatCode: true, status: true, roomId: true },
        },
      },
      orderBy: [
        { seat: { rowLabel: "asc" } },
        { seat: { columnNumber: "asc" } },
      ],
    });
  }
}

export const defaultSessionSeatsRepository = new PrismaSessionSeatsRepository();
