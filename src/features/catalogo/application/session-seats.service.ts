import type { ISessionSeatsRepository } from "../domain/session-seats-repository.interface";
import { defaultSessionSeatsRepository } from "../infrastructure/prisma-session-seats.repository";

export class SessionSeatsServiceClass {
  constructor(
    private sessionSeatsRepo: ISessionSeatsRepository = defaultSessionSeatsRepository
  ) {}

  async getSessionSeatsMap(sessionId: string, tenantId: string) {
    const sessionData = await this.sessionSeatsRepo.findSessionPriceAndStatus(sessionId, tenantId);
    if (!sessionData) {
      return null;
    }

    const sessionSeats = await this.sessionSeatsRepo.findSessionSeats(sessionId, tenantId);
    const now = new Date();

    const lightweightPayload = sessionSeats.map((ss: any) => {
      const isReservationExpired =
        ss.status === "RESERVED" &&
        ss.reservationExpiresAt &&
        new Date(ss.reservationExpiresAt) <= now;

      const effectiveStatus = isReservationExpired ? "AVAILABLE" : ss.status;

      return {
        id: ss.id,
        seat_id: ss.seatId,
        seatId: ss.seatId,
        row: ss.seat.rowLabel,
        rowLabel: ss.seat.rowLabel,
        number: ss.seat.columnNumber,
        columnNumber: ss.seat.columnNumber,
        seatCode: ss.seat.seatCode || (ss.seat.rowLabel + String(ss.seat.columnNumber)),
        status: effectiveStatus,
        price: Number(sessionData.price),
      };
    });

    return lightweightPayload;
  }
}

export const SessionSeatsService = new SessionSeatsServiceClass();
