import { rawPrisma } from "@/shared/db/prisma";
import { hashPassword } from "@/modules/auth/auth-service";
import {
  CryptoService,
  validateCPF,
  maskCPF,
  sanitizeCPF,
} from "@/modules/crypto";
import type { RegisterClientInput, CreateReservationInput } from "./portal-schema";

export class PortalValidationError extends Error {
  public readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "PortalValidationError";
    this.field = field;
  }
}

export class ReservationAntecedenceError extends Error {
  constructor(message: string = "Reservas online so podem ser realizadas com antecedencia minima de 60 minutos do inicio da sessao.") {
    super(message);
    this.name = "ReservationAntecedenceError";
  }
}

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

export interface ClientRegistrationResult {
  userId: string;
  buyerId: string;
  email: string;
  name: string;
  role: "CLIENTE";
  cpfMasked: string;
  tenantId: string;
}

export function generateReservationCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CD-${num}`;
}

export async function registerClient(
  input: RegisterClientInput
): Promise<ClientRegistrationResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const tenantId = input.tenantId.trim();

  if (!validateCPF(input.cpf)) {
    throw new PortalValidationError("O CPF informado e invalido.", "cpf");
  }

  const sanitizedCpf = sanitizeCPF(input.cpf);
  const cpfHash = CryptoService.hashCPF(sanitizedCpf);
  const cpfEncrypted = CryptoService.encryptCPF(sanitizedCpf);
  const lgpdConsentAt = new Date();

  const tenant = await rawPrisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant || !tenant.active) {
    throw new PortalValidationError("Tenant invalido ou inativo.", "tenantId");
  }

  const existingUser = await rawPrisma.user.findFirst({
    where: {
      tenantId,
      email,
    },
  });
  if (existingUser) {
    throw new PortalValidationError("E-mail ja cadastrado para este tenant.", "email");
  }

  const existingBuyer = await rawPrisma.buyer.findFirst({
    where: {
      tenantId,
      cpfHash,
    },
  });

  const passwordHash = await hashPassword(input.password);

  const result = await rawPrisma.$transaction(async (tx) => {
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

  return {
    userId: result.user.id,
    buyerId: result.buyerId,
    email: result.user.email,
    name: result.user.name,
    role: "CLIENTE",
    cpfMasked: maskCPF(sanitizedCpf),
    tenantId: result.user.tenantId,
  };
}

export async function createReservation(
  input: CreateReservationInput,
  tenantId: string,
  loggedUserId?: string
) {
  if (!validateCPF(input.buyer.cpf)) {
    throw new PortalValidationError("O CPF informado e invalido.", "buyer.cpf");
  }

  const sortedSeatIds = [...input.sessionSeatIds].sort();

  return await rawPrisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({
      where: {
        id: input.sessionId,
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
          AND session_id = ${input.sessionId}::uuid
          AND tenant_id = ${tenantId}::uuid
        FOR UPDATE
      `;
    } catch {
      const found = await tx.sessionSeat.findMany({
        where: {
          id: { in: sortedSeatIds },
          sessionId: input.sessionId,
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
      lockedSeats = found.map((s) => ({
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

    const cleanCpf = sanitizeCPF(input.buyer.cpf);
    const cpfHash = CryptoService.hashCPF(cleanCpf);
    const cpfEncrypted = CryptoService.encryptCPF(cleanCpf);
    const lgpdConsentAt = new Date();

    let buyer = await tx.buyer.findFirst({
      where: {
        tenantId,
        cpfHash,
      },
    });

    if (buyer) {
      buyer = await tx.buyer.update({
        where: { id: buyer.id },
        data: {
          name: input.buyer.name.trim(),
          email: input.buyer.email.trim().toLowerCase(),
          cpfEncrypted,
          lgpdConsentAt,
        },
      });
    } else {
      buyer = await tx.buyer.create({
        data: {
          tenantId,
          name: input.buyer.name.trim(),
          email: input.buyer.email.trim().toLowerCase(),
          cpfHash,
          cpfEncrypted,
          lgpdConsentAt,
        },
      });
    }

    const finalUserId = input.userId || loggedUserId || null;

    const reservation = await tx.reservation.create({
      data: {
        code: reservationCode,
        tenantId,
        sessionId: input.sessionId,
        userId: finalUserId,
        buyerId: buyer.id,
        buyerName: input.buyer.name.trim(),
        buyerEmail: input.buyer.email.trim().toLowerCase(),
        buyerCpfHash: cpfHash,
        buyerCpfEncrypted: cpfEncrypted,
        status: "PENDING",
        totalPrice,
        expiresAt: reservationExpiresAt,
      },
    });

    await tx.sessionSeat.updateMany({
      where: {
        id: { in: sortedSeatIds },
        sessionId: input.sessionId,
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
          cpfMasked: maskCPF(cleanCpf),
        },
        instructions:
          "Apresente este codigo na bilheteria fisica do cinema para efetuar o pagamento presencial em dinheiro, debito ou credito ate 1 hora antes do inicio da sessao.",
      },
    };
  });
}

export async function getReservationById(reservationIdOrCode: string, tenantId: string) {
  const isUuid = /^[0-9a-fA-F-]{36}$/.test(reservationIdOrCode);

  const reservation = await rawPrisma.reservation.findFirst({
    where: {
      tenantId,
      ...(isUuid ? { id: reservationIdOrCode } : { code: reservationIdOrCode }),
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
    return null;
  }

  const cleanCpf = reservation.buyer
    ? CryptoService.decryptCPF(reservation.buyer.cpfEncrypted)
    : "";

  return {
    id: reservation.id,
    code: reservation.code,
    sessionId: reservation.sessionId,
    status: reservation.status,
    totalPrice: Number(reservation.totalPrice),
    expiresAt: reservation.expiresAt,
    createdAt: reservation.createdAt,
    film: {
      title: reservation.session.film.title,
      posterUrl: reservation.session.film.posterUrl,
      classification: reservation.session.film.rating,
      duration: reservation.session.film.durationMinutes,
    },
    room: {
      name: reservation.session.room.name,
    },
    session: {
      startsAt: reservation.session.startsAt,
      price: Number(reservation.session.price),
    },
    seats: reservation.sessionSeats.map((ss) => ({
      id: ss.id,
      seatCode: ss.seat.seatCode || `${ss.seat.rowLabel}${ss.seat.columnNumber}`,
      row: ss.seat.rowLabel,
      number: ss.seat.columnNumber,
    })),
    buyer: {
      name: reservation.buyerName,
      email: reservation.buyerEmail,
      cpfMasked: cleanCpf ? maskCPF(cleanCpf) : undefined,
    },
    instructions:
      "Apresente este codigo na bilheteria fisica do cinema para efetuar o pagamento presencial em dinheiro, debito ou credito ate 1 hora antes do inicio da sessao.",
  };
}

export async function listMyReservations(userId: string, tenantId: string) {
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

export async function cancelMyReservation(
  reservationId: string,
  userId: string,
  tenantId: string
) {
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
    throw new PortalValidationError("Reserva nao encontrada.");
  }

  if (reservation.status !== "PENDING") {
    throw new PortalValidationError(
      "Somente reservas com status PENDING podem ser canceladas pelo cliente."
    );
  }

  if (reservation.expiresAt && reservation.expiresAt < new Date()) {
    throw new PortalValidationError("Reserva expirada nao pode ser cancelada.");
  }

  const result = await rawPrisma.$transaction(async (tx) => {
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

  return result;
}

export const PortalService = {
  registerClient,
  createReservation,
  getReservationById,
  listMyReservations,
  cancelMyReservation,
};
