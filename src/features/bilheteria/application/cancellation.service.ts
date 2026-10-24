import type { ICancellationRepository } from "../domain/cancellation-repository.interface";
import {
  defaultCancellationRepository,
  TicketNotFoundError,
  TicketAlreadyCancelledError,
  SessionAlreadyOccurredError,
  CancellationAuditFailedError,
} from "../infrastructure/prisma-cancellation.repository";
import type {
  CancelTicketInput,
  CancellationResponse,
} from "./cancellation.schema";

export {
  TicketNotFoundError,
  TicketAlreadyCancelledError,
  SessionAlreadyOccurredError,
  CancellationAuditFailedError,
};

/**
 * Servico de Cancelamento Auditavel de Ingressos (TASK-11 / AC-3 / AC-5 / ADR-010 / TC-3 / TC-11 / TC-18)
 */
export class CancellationServiceClass {
  constructor(
    private cancellationRepo: ICancellationRepository = defaultCancellationRepository
  ) {}

  /**
   * Cancela um ingresso e libera o assento associado via transacao atomica Prisma.
   * Regra estrita: O registro imutavel em cancellation_audits e persistido ANTES de
   * atualizar o ticket para CANCELLED e o session_seat para AVAILABLE.
   * Se a auditoria falhar, a transacao sofre rollback e o assento permanece vendido (TC-11).
   */
  async cancelTicket(
    ticketId: string,
    input: CancelTicketInput,
    tenantId: string,
    cancelledByUserId: string
  ): Promise<CancellationResponse> {
    return this.cancellationRepo.cancelTicketWithAudit({
      ticketId,
      reason: input.reason,
      tenantId,
      cancelledByUserId,
    });
  }

  /**
   * Consulta os ingressos emitidos no tenant autenticado
   */
  async getTickets(
    tenantId: string,
    filters?: { sessionId?: string; status?: "SOLD" | "CANCELLED" }
  ) {
    return this.cancellationRepo.findTickets(tenantId, filters);
  }

  /**
   * Consulta um ingresso especifico por ID com isolamento de tenant
   */
  async getTicketById(ticketId: string, tenantId: string) {
    const ticket = await this.cancellationRepo.findTicketById(ticketId, tenantId);
    if (!ticket) {
      throw new TicketNotFoundError("Ingresso nao encontrado neste cinema.");
    }
    return ticket;
  }
}

export const CancellationService = new CancellationServiceClass();
export const cancelTicket = CancellationService.cancelTicket.bind(CancellationService);
export const getTickets = CancellationService.getTickets.bind(CancellationService);
export const getTicketById = CancellationService.getTicketById.bind(CancellationService);
