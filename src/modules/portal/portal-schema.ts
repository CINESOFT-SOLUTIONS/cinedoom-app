import { z } from "zod";

export const registerClientSchema = z.object({
  name: z
    .string({ message: 'O campo "name" e obrigatorio' })
    .trim()
    .min(1, "O nome e obrigatorio")
    .max(255, "O nome nao pode ultrapassar 255 caracteres"),
  email: z
    .string({ message: 'O campo "email" e obrigatorio' })
    .trim()
    .toLowerCase()
    .email("E-mail invalido"),
  password: z
    .string({ message: 'O campo "password" e obrigatorio' })
    .min(6, "A senha deve possuir no minimo 6 caracteres"),
  cpf: z
    .string({ message: 'O campo "cpf" e obrigatorio' })
    .trim()
    .min(11, "CPF invalido"),
  lgpdConsent: z.boolean().refine((val) => val === true, {
    message: "O consentimento explicito com os termos da LGPD e obrigatorio.",
  }),
  tenantId: z
    .string({ message: 'O campo "tenantId" e obrigatorio' })
    .uuid("tenantId deve ser um UUID valido"),
});

export type RegisterClientInput = z.infer<typeof registerClientSchema>;

export interface FieldError {
  field: string;
  message: string;
}

export function formatZodErrorsPortal(error: z.ZodError): FieldError[] {
  const issues = error.issues || (error as any).errors || [];
  return issues.map((err) => ({
    field: err.path.join(".") || "payload",
    message: err.message,
  }));
}
