import { z } from "zod";
import { formatZodErrors, type FieldError } from "./sale-schema";



/**
 * Schema Zod para Cancelamento de Ingressos (AC-3 / TC-3 / TC-11 / ADR-010)
 * Normaliza campos "reason" e "motivo" para total interoperabilidade
 */
export const cancelTicketSchema = z.preprocess(
  (input) => {
    if (input && typeof input === "object") {
      const raw = { ...(input as Record<string, unknown>) };
      if (raw.motivo !== undefined && raw.reason === undefined) {
        raw.reason = raw.motivo;
      }
      return raw;
    }
    return input;
  },
  z.object({
    reason: z
      .string({ message: "O motivo do cancelamento e obrigatorio." })
      .trim()
      .min(5, "O motivo do cancelamento deve possuir no minimo 5 caracteres.")
      .max(500, "O motivo do cancelamento nao pode exceder 500 caracteres."),
  })
);

export type CancelTicketInput = z.infer<typeof cancelTicketSchema>;

export interface CancellationResponse {
  success: boolean;
  message: string;
  auditId: string;
  ticketId: string;
  seatId: string;
  sessionId: string;
  cancelledAt: Date;
  reason: string;
}
