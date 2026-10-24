import type { CancellationResponse } from "../application/cancellation.schema";

export interface CancelTicketParams {
  ticketId: string;
  reason: string;
  tenantId: string;
  cancelledByUserId: string;
}

export interface ICancellationRepository {
  cancelTicketWithAudit(params: CancelTicketParams): Promise<CancellationResponse>;
  findTickets(
    tenantId: string,
    filters?: { sessionId?: string; status?: "SOLD" | "CANCELLED" }
  ): Promise<any[]>;
  findTicketById(ticketId: string, tenantId: string): Promise<any | null>;
}
