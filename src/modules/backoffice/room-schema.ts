import { z } from "zod";
import { SeatStatus } from "@prisma/client";

/**
 * Schemas Zod para Salas e Layout Físico de Assentos
 * Rastreabilidade: AC-5, AC-8, TASK-7, ISO/IEC/IEEE 12207:2021
 */
export const createRoomSchema = z.object({
  name: z
    .string({ message: 'O campo "name" e obrigatorio' })
    .trim()
    .min(1, "O nome da sala e obrigatorio")
    .max(100, "O nome da sala nao pode ultrapassar 100 caracteres"),
  rows: z
    .number({ message: 'O numero de fileiras "rows" e obrigatorio' })
    .int("O numero de fileiras deve ser um inteiro")
    .min(1, "A sala deve ter ao menos 1 fileira")
    .max(26, "O numero maximo de fileiras suportado e 26 (letras A a Z)"),
  columns: z
    .number({ message: 'O numero de assentos por fileira "columns" e obrigatorio' })
    .int("O numero de colunas deve ser um inteiro")
    .min(1, "Cada fileira deve ter ao menos 1 assento")
    .max(50, "O numero maximo de assentos por fileira e 50"),
});

export const updateRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "O nome da sala nao pode ser vazio")
    .max(100, "O nome da sala nao pode ultrapassar 100 caracteres")
    .optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export interface GeneratedSeat {
  roomId: string;
  tenantId: string;
  rowLabel: string;
  columnNumber: number;
  seatCode: string;
  status: SeatStatus;
}

/**
 * Converte indice 0-indexed para letra de fileira (0 -> A, 1 -> B, ..., 25 -> Z)
 */
export function getRowLetter(index: number): string {
  if (index < 0 || index >= 26) {
    throw new Error("Indice de fileira invalido (deve ser entre 0 e 25).");
  }
  return String.fromCharCode(65 + index);
}

/**
 * Gera deterministicamente a matriz de assentos para criacao em lote (Seat createMany)
 */
export function generatePhysicalSeats(
  roomId: string,
  tenantId: string,
  rowsCount: number,
  columnsCount: number
): GeneratedSeat[] {
  const seats: GeneratedSeat[] = [];

  for (let r = 0; r < rowsCount; r++) {
    const rowLabel = getRowLetter(r);
    for (let c = 1; c <= columnsCount; c++) {
      seats.push({
        roomId,
        tenantId,
        rowLabel,
        columnNumber: c,
        seatCode: `${rowLabel}${c}`,
        status: SeatStatus.AVAILABLE,
      });
    }
  }

  return seats;
}
