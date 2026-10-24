import { rawPrisma } from "@/shared/db/prisma";

export interface ReservationVoucherData {
  reservationId: string;
  code: string;
  buyerName: string;
  buyerEmail: string;
  filmTitle: string;
  roomName: string;
  startsAt: Date;
  seatCodes: string[];
  totalPrice: number;
  expiresAt: Date;
}

export interface EmailProvider {
  sendReservationVoucher(data: ReservationVoucherData): Promise<void>;
}

export class ConsoleLoggerProvider implements EmailProvider {
  async sendReservationVoucher(data: ReservationVoucherData): Promise<void> {
    console.log("[NOTIFICATION][CONSOLE]", JSON.stringify({
      type: "RESERVATION_VOUCHER",
      to: data.buyerEmail,
      code: data.code,
      film: data.filmTitle,
      room: data.roomName,
      startsAt: data.startsAt,
      seats: data.seatCodes,
      totalPrice: data.totalPrice,
      expiresAt: data.expiresAt,
    }));
  }
}

export class ResendProvider implements EmailProvider {
  async sendReservationVoucher(data: ReservationVoucherData): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY nao configurada");
    }
    console.log("[NOTIFICATION][RESEND] Envio simulado para", data.buyerEmail);
  }
}

function getProvider(): EmailProvider {
  const env = process.env.NODE_ENV;
  const apiKey = process.env.RESEND_API_KEY;
  if (env === "production" && apiKey) {
    return new ResendProvider();
  }
  if (apiKey) {
    return new ResendProvider();
  }
  return new ConsoleLoggerProvider();
}

export const NotificationService = {
  provider: getProvider(),

  async sendReservationVoucher(reservationId: string): Promise<void> {
    const reservation = await rawPrisma.reservation.findUnique({
      where: { id: reservationId },
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
      },
    });

    if (!reservation) {
      throw new Error("Reserva nao encontrada");
    }

    const seatCodes = reservation.sessionSeats
      .map((ss) => ss.seat.seatCode)
      .sort();

    const data: ReservationVoucherData = {
      reservationId: reservation.id,
      code: reservation.code,
      buyerName: reservation.buyerName,
      buyerEmail: reservation.buyerEmail,
      filmTitle: reservation.session.film.title,
      roomName: reservation.session.room.name,
      startsAt: reservation.session.startsAt,
      seatCodes,
      totalPrice: Number(reservation.totalPrice),
      expiresAt: reservation.expiresAt,
    };

    await this.provider.sendReservationVoucher(data);

    await rawPrisma.reservation.update({
      where: { id: reservation.id },
      data: {
        emailSentAt: new Date(),
      },
    });
  },
};
