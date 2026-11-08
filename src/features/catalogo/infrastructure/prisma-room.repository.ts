import { rawPrisma } from "@/shared/db/prisma";
import type {
  IRoomRepository,
  RoomWithDetails,
} from "../domain/room-repository.interface";
import {
  type CreateRoomInput,
  type UpdateRoomInput,
  generatePhysicalSeats,
} from "../application/room.schema";

/**
 * Normaliza nomes de salas legados com sufixo de especificacao (ex: "Sala 4 - VIP" -> "Sala 04"),
 * preservando nomes customizados em testes e novos cadastros.
 */
function normalizeLegacySeedRoomName(name: string): string {
  const match = (name || "")
    .trim()
    .match(/^Sala\s*0?([1-4])\s*[-—•]\s*(CL[ÁA]SSICA|IMAX|VIP|Confort|Tradicional)/i);
  if (match) {
    return `Sala 0${match[1]}`;
  }
  return name;
}

/**
 * Implementacao concreta do IRoomRepository baseada em Prisma Client e Transacoes ACID
 */
export class PrismaRoomRepository implements IRoomRepository {
  async findMany(tenantId: string): Promise<RoomWithDetails[]> {
    const rooms = await rawPrisma.room.findMany({
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

    return (rooms as unknown as RoomWithDetails[]).map((r) => ({
      ...r,
      name: normalizeLegacySeedRoomName(r.name),
    }));
  }

  async findById(id: string, tenantId: string): Promise<RoomWithDetails | null> {
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

    if (!room) return null;
    const details = room as unknown as RoomWithDetails;
    return {
      ...details,
      name: normalizeLegacySeedRoomName(details.name),
    };
  }

  async createWithSeats(
    tenantId: string,
    data: CreateRoomInput
  ): Promise<RoomWithDetails> {
    const capacity = data.rows * data.columns;

    return rawPrisma.$transaction(async (tx) => {
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
      } as unknown as RoomWithDetails;
    });
  }

  async update(id: string, data: UpdateRoomInput): Promise<RoomWithDetails> {
    const room = await rawPrisma.room.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
      },
    });

    return room as unknown as RoomWithDetails;
  }

  async deleteWithSeats(id: string, tenantId: string): Promise<RoomWithDetails> {
    return rawPrisma.$transaction(async (tx) => {
      await tx.seat.deleteMany({
        where: { roomId: id, tenantId },
      });

      const deletedRoom = await tx.room.delete({
        where: { id },
      });

      return deletedRoom as unknown as RoomWithDetails;
    });
  }

  async countSessions(roomId: string, tenantId: string): Promise<number> {
    return rawPrisma.session.count({
      where: {
        roomId,
        tenantId,
      },
    });
  }
}

export const defaultRoomRepository = new PrismaRoomRepository();
