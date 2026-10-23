import { z } from "zod";

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

export const createUserSchema = z.object({
  name: z
    .string({ message: "O nome completo e obrigatorio." })
    .trim()
    .min(2, { message: "O nome deve conter ao menos 2 caracteres." })
    .max(255, { message: "O nome nao pode exceder 255 caracteres." }),
  email: z
    .string({ message: "O e-mail e obrigatorio." })
    .trim()
    .toLowerCase()
    .email({ message: "Formato de e-mail invalido." })
    .max(255, { message: "O e-mail nao pode exceder 255 caracteres." }),
  password: z
    .string({ message: "A senha inicial e obrigatoria." })
    .min(6, { message: "A senha deve possuir no minimo 6 caracteres." })
    .max(100, { message: "A senha nao pode exceder 100 caracteres." }),
  role: z
    .enum(["ATENDENTE", "GERENTE"], {
      message: "Perfil de usuario invalido.",
    })
    .optional()
    .default("ATENDENTE")
    .refine((val) => val === "ATENDENTE", {
      message: "Apenas contas de perfil ATENDENTE podem ser criadas pelo gerente.",
    }),
  active: z.boolean().optional().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "O nome deve conter ao menos 2 caracteres." })
    .max(255, { message: "O nome nao pode exceder 255 caracteres." })
    .optional(),
  password: z
    .string()
    .min(6, { message: "A senha deve possuir no minimo 6 caracteres." })
    .max(100, { message: "A senha nao pode exceder 100 caracteres." })
    .optional(),
  active: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
