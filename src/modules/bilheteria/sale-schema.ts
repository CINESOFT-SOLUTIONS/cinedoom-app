import { z } from "zod";
import { validateCPF, sanitizeCPF } from "@/modules/crypto";

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface FieldError {
  field: string;
  message: string;
}

export function formatZodErrors(error: z.ZodError): FieldError[] {
  const issues = error.issues || (error as any).errors || [];
  return issues.map((err) => ({
    field: err.path.join(".") || "payload",
    message: err.message,
  }));
}

/**
 * Schema de Validacao do Comprador (AC-6 / TC-14 / ADR-008)
 */
export const saleBuyerSchema = z.object({
  name: z
    .string({ message: "O campo nome e obrigatorio." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(255, "O nome nao pode exceder 255 caracteres."),
  cpf: z
    .string({ message: "O campo CPF e obrigatorio." })
    .trim()
    .refine((val) => sanitizeCPF(val).length > 0, "O campo CPF e obrigatorio.")
    .refine((val) => validateCPF(val), "O CPF informado e invalido."),
  email: z
    .string({ message: "O campo email e obrigatorio." })
    .trim()
    .email("O email informado e invalido.")
    .max(255, "O email nao pode exceder 255 caracteres."),
  lgpdConsent: z
    .boolean({ message: "O consentimento LGPD e obrigatorio." })
    .refine((val) => val === true, {
      message: "O consentimento explicito com os termos da LGPD e obrigatorio antes de prosseguir.",
    }),
});

/**
 * Schema de Venda de Ingressos (AC-1 / TC-1 / TC-9 / ADR-007)
 */
export const createSaleSchema = z.object({
  sessionId: z
    .string({ message: "O campo sessionId e obrigatorio." })
    .regex(UUID_REGEX, "sessionId deve ser um UUID valido."),
  sessionSeatIds: z
    .array(
      z.string().regex(UUID_REGEX, "Cada sessionSeatId deve ser um UUID valido."),
      { message: "O campo sessionSeatIds e obrigatorio." }
    )
    .min(1, "Selecione ao menos um assento para prosseguir com a venda."),
  buyer: saleBuyerSchema,
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleBuyerInput = z.infer<typeof saleBuyerSchema>;

export interface TicketResponseItem {
  id: string;
  seatId: string;
  price: number;
  status: string;
  soldAt: Date;
}

export interface SaleResponse {
  success: boolean;
  message: string;
  buyer: {
    id: string;
    name: string;
    email: string;
    cpfMasked: string;
  };
  tickets: TicketResponseItem[];
  totalAmount: number;
}
