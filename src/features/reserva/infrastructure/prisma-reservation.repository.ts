import { rawPrisma } from "@/shared/db/prisma";
import { CryptoService, sanitizeCPF, maskCPF } from "@/modules/crypto";
import type {
  IPublicReservationRepository,
  ExecuteReservationParams,
  RegisterClientParams,
} from "../domain/reservation-repository.interface";

export class SessionNotFoundError extends Error {
  constructor(message: string = "Sessao nao encontrada neste cinema.") {
    super(message);
    this.name = "SessionNotFoundError";
  }
}

export class SessionSeatNotFoundError extends Error {
  constructor(message: string = "Um ou mais assentos selecionados nao foram encontrados nesta sessao.") {
    super(message);
    this.name = "SessionSeatNotFoundError";
  }
}

export class SeatNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeatNotAvailableError";
  }
}

export class ReservationAntecedenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationAntecedenceError";
  }
}

function generateReservationCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CD-${num}`;
}

export class PrismaPublicReservationRepository implements IPublicReservationRepository {
  async executeReservationTransaction(params: ExecuteReservationParams): Promise<any> {
    const { sessionId, tenantId, sortedSeatIds, buyer: buyerData, userId } = params;

    return await rawPrisma.$transaction(async (tx) => {
      const session = await tx.session.findFirst({
        where: {
          id: sessionId,
          tenantId,
        },
        include: {
          film: true,
          room: true,
        },
      });

      if (!session) {
        throw new SessionNotFoundError("Sessao nao encontrada neste cinema.");
      }

      if (session.status === "CANCELLED") {
        throw new SeatNotAvailableError("Nao e possivel reservar assentos para uma sessao cancelada.");
      }

      const now = new Date();
      const sessionStartsAt = new Date(session.startsAt);
      const msUntilSession = sessionStartsAt.getTime() - now.getTime();
      const minAntecedenceMs = 60 * 60 * 1000;

      if (msUntilSession < minAntecedenceMs) {
        throw new ReservationAntecedenceError(
          "Reservas online so podem ser realizadas com antecedencia minima de 60 minutos do inicio da sessao."
        );
      }

      let lockedSeats: Array<{
        id: string;
        status: string;
        seat_id?: string;
        seatId?: string;
        reservation_id?: string | null;
        reservationId?: string | null;
        reservation_expires_at?: Date | null;
        reservationExpiresAt?: Date | null;
      }>;

      try {
        lockedSeats = await tx.$queryRaw<any[]>`
          SELECT id, status, seat_id, reservation_id, reservation_expires_at
          FROM session_seats
          WHERE id = ANY(${sortedSeatIds}::uuid[])
            AND session_id = ${sessionId}::uuid
            AND tenant_id = ${tenantId}::uuid
          FOR UPDATE
        `;
      } catch {
        const found = await tx.sessionSeat.findMany({
          where: {
            id: { in: sortedSeatIds },
            sessionId,
            tenantId,
          },
          select: {
            id: true,
            status: true,
            seatId: true,
            reservationId: true,
            reservationExpiresAt: true,
          },
        });
        lockedSeats = found.map((s: any) => ({
          id: s.id,
          status: s.status,
          seat_id: s.seatId,
          reservation_id: s.reservationId,
          reservation_expires_at: s.reservationExpiresAt,
        }));
      }

      if (!lockedSeats || lockedSeats.length !== sortedSeatIds.length) {
        throw new SessionSeatNotFoundError(
          "Um ou mais assentos selecionados nao foram encontrados nesta sessao."
        );
      }

      for (const seat of lockedSeats) {
        const expiresAtVal = seat.reservation_expires_at || seat.reservationExpiresAt;
        const isReservationExpired =
          seat.status === "RESERVED" &&
          expiresAtVal &&
          new Date(expiresAtVal) <= now;

        if (seat.status !== "AVAILABLE" && !isReservationExpired) {
          throw new SeatNotAvailableError(
            `O assento selecionado (${seat.id}) ja foi vendido ou reservado (status: ${seat.status}).`
          );
        }
      }

      const reservationExpiresAt = new Date(sessionStartsAt.getTime() - minAntecedenceMs);
      const totalPrice = Number(session.price) * sortedSeatIds.length;

      let reservationCode = "";
      let attempts = 0;
      while (attempts < 10) {
        const code = generateReservationCode();
        const existing = await tx.reservation.findUnique({ where: { code } });
        if (!existing) {
          reservationCode = code;
          break;
        }
        attempts++;
      }
      if (!reservationCode) {
        reservationCode = `CD-${Date.now().toString().slice(-4)}`;
      }

      let buyer = await tx.buyer.findFirst({
        where: {
          tenantId,
          cpfHash: buyerData.cpfHash,
        },
      });

      if (buyer) {
        buyer = await tx.buyer.update({
          where: { id: buyer.id },
          data: {
            name: buyerData.name,
            email: buyerData.email,
            cpfEncrypted: buyerData.cpfEncrypted,
            lgpdConsentAt: buyerData.lgpdConsentAt,
          },
        });
      } else {
        buyer = await tx.buyer.create({
          data: {
            tenantId,
            name: buyerData.name,
            email: buyerData.email,
            cpfHash: buyerData.cpfHash,
            cpfEncrypted: buyerData.cpfEncrypted,
            lgpdConsentAt: buyerData.lgpdConsentAt,
          },
        });
      }

      const reservation = await tx.reservation.create({
        data: {
          code: reservationCode,
          tenantId,
          sessionId,
          userId,
          buyerId: buyer.id,
          buyerName: buyerData.name,
          buyerEmail: buyerData.email,
          buyerCpfHash: buyerData.cpfHash,
          buyerCpfEncrypted: buyerData.cpfEncrypted,
          status: "PENDING",
          totalPrice,
          expiresAt: reservationExpiresAt,
        },
      });

      await tx.sessionSeat.updateMany({
        where: {
          id: { in: sortedSeatIds },
          sessionId,
          tenantId,
        },
        data: {
          status: "RESERVED",
          reservationId: reservation.id,
          reservationExpiresAt,
        },
      });

      return {
        success: true,
        reservation: {
          id: reservation.id,
          code: reservation.code,
          sessionId: session.id,
          filmTitle: session.film.title,
          roomName: session.room.name,
          startsAt: session.startsAt,
          status: reservation.status,
          totalPrice: Number(reservation.totalPrice),
          expiresAt: reservation.expiresAt,
          seatCount: sortedSeatIds.length,
          seatIds: sortedSeatIds,
          buyer: {
            name: buyer.name,
            email: buyer.email,
            cpfMasked: maskCPF(buyerData.cleanCpf),
          },
          instructions:
            "Apresente este codigo na bilheteria fisica do cinema para efetuar o pagamento presencial em dinheiro, debito ou credito ate 1 hora antes do inicio da sessao.",
        },
      };
    });
  }

  async findReservationByIdOrCode(idOrCode: string, tenantId: string): Promise<any | null> {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrCode);

    return rawPrisma.reservation.findFirst({
      where: {
        tenantId,
        ...(isUuid ? { id: idOrCode } : { code: idOrCode }),
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

  async findUserReservations(userId: string, tenantId: string): Promise<any[]> {
    return rawPrisma.reservation.findMany({
      where: {
        userId,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async cancelPendingReservation(reservationId: string, userId: string, tenantId: string): Promise<any> {
    const reservation = await rawPrisma.reservation.findFirst({
      where: {
        id: reservationId,
        userId,
        tenantId,
      },
      include: {
        sessionSeats: true,
      },
    });

    if (!reservation) {
      return { notFound: true };
    }

    if (reservation.status !== "PENDING") {
      return { invalidStatus: true };
    }

    if (reservation.expiresAt && reservation.expiresAt < new Date()) {
      return { expired: true };
    }

    return rawPrisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
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
            status: "AVAILABLE",
            reservationId: null,
            reservationExpiresAt: null,
          },
        });
      }

      return updatedReservation;
    });
  }

  async findDefaultActiveTenantId(): Promise<string | null> {
    const defaultTenant = await rawPrisma.tenant.findFirst({
      where: { active: true },
      select: { id: true },
    });
    return defaultTenant?.id || null;
  }

  async isTenantActive(tenantId: string): Promise<boolean> {
    const tenant = await rawPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { active: true },
    });
    return Boolean(tenant?.active);
  }

  async findUserByEmail(tenantId: string, email: string): Promise<{ id: string } | null> {
    return rawPrisma.user.findFirst({
      where: { tenantId, email },
      select: { id: true },
    });
  }

  async findBuyerByCpfHash(tenantId: string, cpfHash: string): Promise<{ id: string } | null> {
    return rawPrisma.buyer.findFirst({
      where: { tenantId, cpfHash },
      select: { id: true },
    });
  }

  async registerClientTransaction(params: RegisterClientParams): Promise<{ user: any; buyerId: string }> {
    const { tenantId, name, email, passwordHash, cpfHash, cpfEncrypted, lgpdConsentAt } = params;
    return rawPrisma.$transaction(async (tx) => {
      const existingBuyer = await tx.buyer.findFirst({
        where: { tenantId, cpfHash },
        select: { id: true },
      });

      let buyerId: string;
      if (existingBuyer) {
        const updatedBuyer = await tx.buyer.update({
          where: { id: existingBuyer.id },
          data: {
            name,
            email,
            cpfEncrypted,
            lgpdConsentAt,
          },
        });
        buyerId = updatedBuyer.id;
      } else {
        const createdBuyer = await tx.buyer.create({
          data: {
            tenantId,
            name,
            email,
            cpfHash,
            cpfEncrypted,
            lgpdConsentAt,
          },
        });
        buyerId = createdBuyer.id;
      }

      const user = await tx.user.create({
        data: {
          tenantId,
          email,
          name,
          passwordHash,
          role: "CLIENTE",
          active: true,
        },
      });

      return { user, buyerId };
    });
  }
}

export const defaultPublicReservationRepository = new PrismaPublicReservationRepository();
