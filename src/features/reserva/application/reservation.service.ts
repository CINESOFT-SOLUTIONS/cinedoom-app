import { hashPassword } from "@/modules/auth/auth-service";
import {
  CryptoService,
  validateCPF,
  maskCPF,
  sanitizeCPF,
} from "@/modules/crypto";
import type {
  IPublicReservationRepository,
} from "../domain/reservation-repository.interface";
import {
  defaultPublicReservationRepository,
  SessionNotFoundError,
  SessionSeatNotFoundError,
  SeatNotAvailableError,
  ReservationAntecedenceError,
} from "../infrastructure/prisma-reservation.repository";
import type {
  RegisterClientInput,
  CreateReservationInput,
} from "./reservation.schema";

export {
  SessionNotFoundError,
  SessionSeatNotFoundError,
  SeatNotAvailableError,
  ReservationAntecedenceError,
};

export class PortalValidationError extends Error {
  public readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "PortalValidationError";
    this.field = field;
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

export class PublicReservationServiceClass {
  constructor(
    private reservationRepo: IPublicReservationRepository = defaultPublicReservationRepository
  ) {}

  async registerClient(
    input: RegisterClientInput
  ): Promise<ClientRegistrationResult> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    let tenantId = input.tenantId?.trim();

    if (!tenantId) {
      const defaultTenantId = await this.reservationRepo.findDefaultActiveTenantId();
      if (!defaultTenantId) {
        throw new PortalValidationError("Nenhum cinema ativo configurado no sistema.", "tenantId");
      }
      tenantId = defaultTenantId;
    }

    if (!validateCPF(input.cpf)) {
      throw new PortalValidationError("O CPF informado e invalido.", "cpf");
    }

    const sanitizedCpf = sanitizeCPF(input.cpf);
    const cpfHash = CryptoService.hashCPF(sanitizedCpf);
    const cpfEncrypted = CryptoService.encryptCPF(sanitizedCpf);
    const lgpdConsentAt = new Date();

    const isTenantActive = await this.reservationRepo.isTenantActive(tenantId);
    if (!isTenantActive) {
      throw new PortalValidationError("Tenant invalido ou inativo.", "tenantId");
    }

    const existingUser = await this.reservationRepo.findUserByEmail(tenantId, email);
    if (existingUser) {
      throw new PortalValidationError("E-mail ja cadastrado para este tenant.", "email");
    }

    const passwordHash = await hashPassword(input.password);

    const result = await this.reservationRepo.registerClientTransaction({
      tenantId,
      name,
      email,
      passwordHash,
      cpfHash,
      cpfEncrypted,
      lgpdConsentAt,
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

  async createReservation(
    input: CreateReservationInput,
    tenantId: string,
    loggedUserId?: string
  ) {
    if (!validateCPF(input.buyer.cpf)) {
      throw new PortalValidationError("O CPF informado e invalido.", "buyer.cpf");
    }

    const sortedSeatIds = [...input.sessionSeatIds].sort();

    const cleanCpf = sanitizeCPF(input.buyer.cpf);
    const cpfHash = CryptoService.hashCPF(cleanCpf);
    const cpfEncrypted = CryptoService.encryptCPF(cleanCpf);
    const lgpdConsentAt = new Date();

    const finalUserId = input.userId || loggedUserId || null;

    return this.reservationRepo.executeReservationTransaction({
      sessionId: input.sessionId,
      tenantId,
      sortedSeatIds,
      userId: finalUserId,
      buyer: {
        name: input.buyer.name.trim(),
        email: input.buyer.email.trim().toLowerCase(),
        cleanCpf,
        cpfHash,
        cpfEncrypted,
        lgpdConsentAt,
      },
    });
  }

  async getReservationById(reservationIdOrCode: string, tenantId: string) {
    const reservation = await this.reservationRepo.findReservationByIdOrCode(
      reservationIdOrCode,
      tenantId
    );

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
      seats: reservation.sessionSeats.map((ss: any) => ({
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

  async listMyReservations(userId: string, tenantId: string) {
    return this.reservationRepo.findUserReservations(userId, tenantId);
  }

  async cancelMyReservation(
    reservationId: string,
    userId: string,
    tenantId: string
  ) {
    const res = await this.reservationRepo.cancelPendingReservation(
      reservationId,
      userId,
      tenantId
    );

    if (res.notFound) {
      throw new PortalValidationError("Reserva nao encontrada.");
    }
    if (res.invalidStatus) {
      throw new PortalValidationError(
        "Somente reservas com status PENDING podem ser canceladas pelo cliente."
      );
    }
    if (res.expired) {
      throw new PortalValidationError("Reserva expirada nao pode ser cancelada.");
    }

    return res;
  }
}

export const PublicReservationService = new PublicReservationServiceClass();
export const registerClient = PublicReservationService.registerClient.bind(PublicReservationService);
export const createReservation = PublicReservationService.createReservation.bind(PublicReservationService);
export const getReservationById = PublicReservationService.getReservationById.bind(PublicReservationService);
export const listMyReservations = PublicReservationService.listMyReservations.bind(PublicReservationService);
export const cancelMyReservation = PublicReservationService.cancelMyReservation.bind(PublicReservationService);

export const PortalService = {
  registerClient,
  createReservation,
  getReservationById,
  listMyReservations,
  cancelMyReservation,
};
