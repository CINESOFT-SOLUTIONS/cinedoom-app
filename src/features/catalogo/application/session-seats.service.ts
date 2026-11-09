import type { ISessionSeatsRepository } from "../domain/session-seats-repository.interface";
import { defaultSessionSeatsRepository } from "../infrastructure/prisma-session-seats.repository";
import { isSeatBlockedForMaintenance } from "@/modules/portal/mock-cinema-data";

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
    const roomId = (sessionData as any).roomId;

    const lightweightPayload = sessionSeats.map((ss: any) => {
      const code = ss.seat?.seatCode || (ss.seat ? `${ss.seat.rowLabel}${ss.seat.columnNumber}` : "");
      const seatRoomId = ss.seat?.roomId || roomId;
      const isPhysicallyBlocked =
        ss.status === "BLOCKED" ||
        ss.seat?.status === "BLOCKED" ||
        isSeatBlockedForMaintenance(code, seatRoomId);

      let effectiveStatus = ss.status;
      if (isPhysicallyBlocked) {
        effectiveStatus = "BLOCKED";
      } else if (
        ss.status === "RESERVED" &&
        ss.reservationExpiresAt &&
        new Date(ss.reservationExpiresAt) <= now
      ) {
        effectiveStatus = "AVAILABLE";
      }

      return {
        id: ss.id,
        seat_id: ss.seatId,
        seatId: ss.seatId,
        row: ss.seat.rowLabel,
        rowLabel: ss.seat.rowLabel,
        number: ss.seat.columnNumber,
        columnNumber: ss.seat.columnNumber,
        seatCode: code,
        status: effectiveStatus,
        price: Number(sessionData.price),
      };
    });

    return lightweightPayload;
  }
}

export const SessionSeatsService = new SessionSeatsServiceClass();
