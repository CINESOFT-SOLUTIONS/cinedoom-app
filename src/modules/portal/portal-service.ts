import { rawPrisma } from "@/shared/db/prisma";
import { hashPassword } from "@/modules/auth/auth-service";
import {
  CryptoService,
  validateCPF,
  maskCPF,
  sanitizeCPF,
} from "@/modules/crypto";
import type { RegisterClientInput } from "./portal-schema";

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
  listMyReservations,
  cancelMyReservation,
};
