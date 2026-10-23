import { z } from "zod";
import { SessionStatus } from "@prisma/client";

/**
 * Schemas Zod para Sessoes Cinematograficas
 * Rastreabilidade: AC-5, AC-8, ADR-007, TASK-8, ISO/IEC/IEEE 12207:2021
 * Suporta interoperabilidade camelCase e snake_case
 */

export const createSessionSchema = z.preprocess(
  (input) => {
    if (input && typeof input === "object") {
      const raw = { ...(input as Record<string, unknown>) };
      if (raw.film_id !== undefined && raw.filmId === undefined) {
        raw.filmId = raw.film_id;
      }
      if (raw.room_id !== undefined && raw.roomId === undefined) {
        raw.roomId = raw.room_id;
      }
      if (raw.starts_at !== undefined && raw.startsAt === undefined) {
        raw.startsAt = raw.starts_at;
      }
      if (typeof raw.price === "string" && !isNaN(Number(raw.price))) {
        raw.price = Number(raw.price);
      }
      return raw;
    }
    return input;
  },
  z.object({
    filmId: z
      .string({ message: "O campo filmId e obrigatorio" })
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "O filmId deve ser um UUID valido"),
    roomId: z
      .string({ message: "O campo roomId e obrigatorio" })
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "O roomId deve ser um UUID valido"),
    startsAt: z
      .union([z.string(), z.date()], { message: "A data e hora de inicio startsAt e obrigatoria" })
      .transform((val) => (typeof val === "string" ? new Date(val) : val))
      .refine((date) => !isNaN(date.getTime()), {
        message: "Data e hora de inicio startsAt invalida",
      }),
    price: z
      .number({ message: "O valor do ingresso price e obrigatorio" })
      .positive("O valor do ingresso deve ser maior que zero"),
    status: z
      .nativeEnum(SessionStatus)
      .optional()
      .default(SessionStatus.SCHEDULED),
  })
);

export const updateSessionSchema = z.preprocess(
  (input) => {
    if (input && typeof input === "object") {
      const raw = { ...(input as Record<string, unknown>) };
      if (raw.film_id !== undefined && raw.filmId === undefined) {
        raw.filmId = raw.film_id;
      }
      if (raw.room_id !== undefined && raw.roomId === undefined) {
        raw.roomId = raw.room_id;
      }
      if (raw.starts_at !== undefined && raw.startsAt === undefined) {
        raw.startsAt = raw.starts_at;
      }
      if (typeof raw.price === "string" && !isNaN(Number(raw.price))) {
        raw.price = Number(raw.price);
      }
      return raw;
    }
    return input;
  },
  z.object({
    startsAt: z
      .union([z.string(), z.date()])
      .transform((val) => (typeof val === "string" ? new Date(val) : val))
      .refine((date) => !isNaN(date.getTime()), {
        message: "Data e hora de inicio startsAt invalida",
      })
      .optional(),
    price: z
      .number()
      .positive("O valor do ingresso deve ser maior que zero")
      .optional(),
    status: z
      .nativeEnum(SessionStatus)
      .optional(),
  })
);

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
