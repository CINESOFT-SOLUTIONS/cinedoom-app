import { rawPrisma } from "@/shared/db/prisma";
import {
  type CreateRoomInput,
  type UpdateRoomInput,
  generatePhysicalSeats,
} from "./room-schema";

export class RoomNotFoundError extends Error {
  constructor(message = "Sala nao encontrada neste cinema.") {
    super(message);
    this.name = "RoomNotFoundError";
  }
}

export class RoomInUseError extends Error {
  constructor(message = "Nao e possivel excluir a sala pois existem sessoes agendadas para ela.") {
    super(message);
    this.name = "RoomInUseError";
  }
}

/**
 * Lista as salas cadastradas para o tenant com contagem de assentos e sessoes
 */
export async function listRooms(tenantId: string) {
  return rawPrisma.room.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: {
          seats: true,
          sessions: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Obtem detalhes da sala e todos os assentos fisicos ordenados por fileira e coluna
 */
export async function getRoomById(id: string, tenantId: string) {
  const room = await rawPrisma.room.findFirst({
    where: { id, tenantId },
    include: {
      seats: {
        orderBy: [{ rowLabel: "asc" }, { columnNumber: "asc" }],
      },
      _count: {
        select: { sessions: true },
      },
    },
  });

  if (!room) {
    throw new RoomNotFoundError();
  }

  return room;
}

/**
 * Cria a sala e gera deterministicamente a matriz de assentos fisicos (Seat) em transacao ACID (TASK-7)
 */
export async function createRoom(data: CreateRoomInput, tenantId: string) {
  const capacity = data.rows * data.columns;

  return rawPrisma.$transaction(async (tx) => {
    // 1. Cria a sala
    const room = await tx.room.create({
      data: {
        tenantId,
        name: data.name,
        capacity,
        layoutMetadata: {
          rows: data.rows,
          columns: data.columns,
          totalSeats: capacity,
        },
      },
    });

    // 2. Gera todos os assentos fisicos em lote (ex: 10 x 12 = 120 assentos A1, A2... J12)
    const seatsToInsert = generatePhysicalSeats(
      room.id,
      tenantId,
      data.rows,
      data.columns
    );

    await tx.seat.createMany({
      data: seatsToInsert,
    });

    return {
      ...room,
      seatsGeneratedCount: seatsToInsert.length,
    };
  });
}

/**
 * Atualiza o nome da sala
 */
export async function updateRoom(id: string, data: UpdateRoomInput, tenantId: string) {
  await getRoomById(id, tenantId);

  return rawPrisma.room.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
    },
  });
}

/**
 * Exclui a sala e seus assentos fisicos se nao houver sessoes cadastradas
 */
export async function deleteRoom(id: string, tenantId: string) {
  const room = await getRoomById(id, tenantId);

  const sessionsCount = await rawPrisma.session.count({
    where: {
      roomId: id,
      tenantId,
    },
  });

  if (sessionsCount > 0) {
    throw new RoomInUseError(
      `A sala "${room.name}" possui ${sessionsCount} sessao(oes) vinculada(s) e nao pode ser excluida.`
    );
  }

  return rawPrisma.$transaction(async (tx) => {
    await tx.seat.deleteMany({
      where: { roomId: id, tenantId },
    });

    return tx.room.delete({
      where: { id },
    });
  });
}

export const RoomService = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
