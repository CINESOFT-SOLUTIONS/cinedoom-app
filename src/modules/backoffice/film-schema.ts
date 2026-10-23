import { z } from "zod";

/**
 * Schema Zod para criacao de filme no catalogo
 * Rastreabilidade: AC-8, TC-8, TC-16, ISO/IEC/IEEE 12207:2021
 */
export const createFilmSchema = z.object({
  title: z
    .string({ message: 'O campo "title" e obrigatorio' })
    .trim()
    .min(1, 'O titulo do filme e obrigatorio')
    .max(255, "O titulo nao pode ultrapassar 255 caracteres"),
  durationMinutes: z
    .number({ message: 'O campo "durationMinutes" e obrigatorio' })
    .int("A duracao deve ser expressa em minutos inteiros")
    .positive("A duracao deve ser maior que 0 minutos"),
  director: z
    .string()
    .trim()
    .max(255, "O nome do diretor nao pode ultrapassar 255 caracteres")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  rating: z
    .string()
    .trim()
    .max(10, "A classificacao indicativa nao pode ultrapassar 10 caracteres")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  synopsis: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  posterUrl: z
    .string()
    .trim()
    .max(500, "A URL do poster nao pode ultrapassar 500 caracteres")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export const updateFilmSchema = createFilmSchema.partial();

export type CreateFilmInput = z.infer<typeof createFilmSchema>;
export type UpdateFilmInput = z.infer<typeof updateFilmSchema>;

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Converte ZodError em array de erros estruturados para resposta HTTP 422 Unprocessable Entity (TC-16)
 */
export function formatZodErrors(error: z.ZodError): FieldError[] {
  const issues = error.issues || (error as any).errors || [];
  return issues.map((err) => ({
    field: err.path.join(".") || "payload",
    message: err.message,
  }));
}
