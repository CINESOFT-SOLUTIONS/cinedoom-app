import { rawPrisma } from "@/shared/db/prisma";
import type {
  ICounterRepository,
  CounterSaleInput,
} from "../domain/counter-repository.interface";

export class ReservationNotFoundError extends Error {
  constructor(message = "Reserva nao encontrada.") {
    super(message);
    this.name = "ReservationNotFoundError";
  }
}

export class ReservationNotCancellableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationNotCancellableError";
  }
}

export class PrismaCounterRepository implements ICounterRepository {
  async findReservationByCode(reservationCode: string, tenantId: string) {
    return rawPrisma.reservation.findFirst({
      where: {
        code: reservationCode,
        tenantId,
      },
      include: {
        session: {
          include: {
            film: true,
            room: true,
          },
        },
        sessionSeats: {
          include: {
            seat: true,
          },
        },
        buyer: true,
      },
    });
  }

  async confirmReservationPayment(input: CounterSaleInput) {
    const { reservationCode, tenantId, soldByUserId } = input;

    return rawPrisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: {
          code: reservationCode,
          tenantId,
        },
        include: {
          sessionSeats: true,
        },
      });

      if (!reservation) {
        throw new ReservationNotFoundError();
      }

      if (reservation.status !== "PENDING") {
        throw new ReservationNotCancellableError(
          "Apenas reservas PENDING podem ser confirmadas no balcão."
        );
      }

      if (reservation.expiresAt && reservation.expiresAt < new Date()) {
        throw new ReservationNotCancellableError("Reserva expirada.");
      }

      if (!reservation.buyerId) {
        throw new ReservationNotCancellableError(
          "Reserva sem comprador vinculado não pode ser confirmada no balcão."
        );
      }

      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      if (reservation.sessionSeats.length > 0) {
        const seatIds = reservation.sessionSeats.map((s) => s.id);
        await tx.sessionSeat.updateMany({
          where: {
            id: { in: seatIds },
            reservationId: reservation.id,
          },
          data: {
            status: "SOLD",
            reservationId: null,
            reservationExpiresAt: null,
          },
        });

        const totalPrice = Number(reservation.totalPrice);
        const seatCount = reservation.sessionSeats.length;
        const pricePerSeat = seatCount > 0 ? totalPrice / seatCount : totalPrice;

        for (const ss of reservation.sessionSeats) {
          await tx.ticket.create({
            data: {
              tenantId,
              sessionId: reservation.sessionId,
              seatId: ss.seatId,
              buyerId: reservation.buyerId,
              soldByUserId,
              status: "SOLD",
              price: pricePerSeat,
            },
          });
        }
      }

      return {
        success: true,
        message: "Reserva confirmada e ingressos gerados.",
        reservationId: updatedReservation.id,
        status: updatedReservation.status,
        confirmedAt: updatedReservation.confirmedAt,
      };
    });
  }
}

export const defaultCounterRepository = new PrismaCounterRepository();
