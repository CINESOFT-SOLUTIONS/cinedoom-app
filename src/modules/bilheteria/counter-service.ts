import { rawPrisma } from "@/shared/db/prisma";
import { CryptoService, maskCPF } from "@/modules/crypto";

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

export interface CounterSaleInput {
  reservationCode: string;
  tenantId: string;
  soldByUserId: string;
  paymentMethod?: string;
}

export const CounterService = {
  async findReservationByCode(reservationCode: string, tenantId: string) {
    const reservation = await rawPrisma.reservation.findFirst({
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

    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    let buyerCpfMasked = "***.***.***-**";

    try {
      if (reservation.buyer?.cpfEncrypted) {
        const plainCpf = CryptoService.decryptCPF(reservation.buyer.cpfEncrypted);
        buyerCpfMasked = maskCPF(plainCpf);
      } else if (reservation.buyerCpfEncrypted) {
        const plainCpf = CryptoService.decryptCPF(reservation.buyerCpfEncrypted);
        buyerCpfMasked = maskCPF(plainCpf);
      }
    } catch {
      buyerCpfMasked = "***.***.***-**";
    }

    return {
      ...reservation,
      buyerCpfMasked,
    };
  },

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
  },
};
