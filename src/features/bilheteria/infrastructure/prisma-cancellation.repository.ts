import { rawPrisma } from "@/shared/db/prisma";
import type {
  ICancellationRepository,
  CancelTicketParams,
} from "../domain/cancellation-repository.interface";
import type { CancellationResponse } from "../application/cancellation.schema";

export class TicketNotFoundError extends Error {
  constructor(message: string = "Ingresso nao encontrado neste cinema.") {
    super(message);
    this.name = "TicketNotFoundError";
  }
}

export class TicketAlreadyCancelledError extends Error {
  constructor(message: string = "Este ingresso ja foi cancelado anteriormente.") {
    super(message);
    this.name = "TicketAlreadyCancelledError";
  }
}

export class SessionAlreadyOccurredError extends Error {
  constructor(
    message: string = "Nao e permitido cancelar ingressos de sessoes passadas ou ja iniciadas."
  ) {
    super(message);
    this.name = "SessionAlreadyOccurredError";
  }
}

export class CancellationAuditFailedError extends Error {
  constructor(message: string = "Falha ao gravar registro imutavel de auditoria de cancelamento.") {
    super(message);
    this.name = "CancellationAuditFailedError";
  }
}

export class PrismaCancellationRepository implements ICancellationRepository {
  async cancelTicketWithAudit(params: CancelTicketParams): Promise<CancellationResponse> {
    const { ticketId, reason, tenantId, cancelledByUserId } = params;

    return await rawPrisma.$transaction(async (tx) => {
      // 1. Busca o ingresso validando estritamente o isolamento de tenant (TC-18)
      const ticket = await tx.ticket.findFirst({
        where: {
          id: ticketId,
          tenantId,
        },
        include: {
          session: true,
          seat: true,
        },
      });

      if (!ticket) {
        throw new TicketNotFoundError("Ingresso nao encontrado neste cinema.");
      }

      // 2. Impede cancelamento duplo de ingresso ja cancelado
      if (ticket.status === "CANCELLED") {
        throw new TicketAlreadyCancelledError("Este ingresso ja foi cancelado anteriormente.");
      }

      // 3. Valida se a sessao ainda nao ocorreu (sessao passada nao permite cancelamento)
      const now = new Date();
      if (new Date(ticket.session.startsAt) < now) {
        throw new SessionAlreadyOccurredError(
          "Nao e permitido cancelar ingressos de sessoes passadas ou ja iniciadas."
        );
      }

      // 4. Insercao obrigatoria na tabela cancellation_audits ANTES de liberar assento (AC-3 / TC-3 / TC-11)
      let auditRecord;
      try {
        auditRecord = await tx.cancellationAudit.create({
          data: {
            tenantId,
            ticketId: ticket.id,
            cancelledByUserId,
            reason: reason.trim(),
            cancelledAt: now,
          },
        });
      } catch (err) {
        throw new CancellationAuditFailedError(
          err instanceof Error
            ? `Falha ao registrar auditoria imutavel: ${err.message}`
            : "Falha ao registrar auditoria imutavel de cancelamento (TC-11)."
        );
      }

      // 5. Atualiza o status do ingresso para CANCELLED
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "CANCELLED",
        },
      });

      // 6. Libera o SessionSeat correspondente de volta para AVAILABLE
      await tx.sessionSeat.updateMany({
        where: {
          sessionId: ticket.sessionId,
          seatId: ticket.seatId,
          tenantId,
        },
        data: {
          status: "AVAILABLE",
          reservationId: null,
          reservationExpiresAt: null,
        },
      });

      return {
        success: true,
        message: "Ingresso cancelado com sucesso e auditoria imutavel registrada.",
        auditId: auditRecord.id,
        ticketId: ticket.id,
        seatId: ticket.seatId,
        sessionId: ticket.sessionId,
        cancelledAt: auditRecord.cancelledAt,
        reason: auditRecord.reason,
      };
    });
  }

  async findTickets(
    tenantId: string,
    filters?: { sessionId?: string; status?: "SOLD" | "CANCELLED" }
  ) {
    return await rawPrisma.ticket.findMany({
      where: {
        tenantId,
        ...(filters?.sessionId ? { sessionId: filters.sessionId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        session: {
          include: {
            film: {
              select: {
                id: true,
                title: true,
                durationMinutes: true,
              },
            },
            room: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        seat: {
          select: {
            id: true,
            rowLabel: true,
            columnNumber: true,
            seatCode: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cancellationAudit: {
          select: {
            id: true,
            reason: true,
            cancelledAt: true,
            cancelledByUserId: true,
          },
        },
      },
      orderBy: {
        soldAt: "desc",
      },
    });
  }

  async findTicketById(ticketId: string, tenantId: string) {
    const ticket = await rawPrisma.ticket.findFirst({
      where: {
        id: ticketId,
        tenantId,
      },
      include: {
        session: {
          include: {
            film: true,
            room: true,
          },
        },
        seat: true,
        buyer: true,
        cancellationAudit: true,
      },
    });

    return ticket;
  }
}

export const defaultCancellationRepository = new PrismaCancellationRepository();
