import { z } from "zod";
import { validateCPF } from "@/modules/crypto";

export interface FieldError {
  field: string;
  message: string;
}

export function formatZodErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "geral",
    message: issue.message,
  }));
}

export const anonymizeTitularSchema = z
  .object({
    cpf: z
      .string({ message: "O CPF ou ID do comprador e obrigatorio." })
      .optional(),
    buyerId: z
      .string()
      .uuid({ message: "O buyerId informado deve ser um UUID valido." })
      .optional(),
    reason: z
      .string()
      .max(500, { message: "O motivo nao pode exceder 500 caracteres." })
      .optional()
      .default("Solicitacao de anonimizacao e exclusao de dados pessoais com base no Art. 18 da LGPD."),
  })
  .refine((data) => Boolean(data.cpf || data.buyerId), {
    message: "Informe ao menos o CPF ou o ID do comprador para prosseguir com a anonimizacao.",
    path: ["cpf"],
  })
  .refine(
    (data) => {
      if (data.cpf) {
        return validateCPF(data.cpf);
      }
      return true;
    },
    {
      message: "O CPF informado e invalido.",
      path: ["cpf"],
    }
  );

export type AnonymizeTitularInput = z.input<typeof anonymizeTitularSchema>;
export type AnonymizeTitularOutput = z.output<typeof anonymizeTitularSchema>;
