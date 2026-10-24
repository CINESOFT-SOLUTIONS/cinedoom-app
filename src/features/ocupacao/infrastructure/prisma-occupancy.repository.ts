import { rawPrisma } from "@/shared/db/prisma";
import type { IOccupancyRepository } from "../domain/occupancy-repository.interface";

export class PrismaOccupancyRepository implements IOccupancyRepository {
  async findSessionsWithOccupancy(
    tenantId: string,
    start: Date,
    end: Date,
    roomId?: string
  ): Promise<any[]> {
    return rawPrisma.session.findMany({
      where: {
        tenantId,
        startsAt: {
          gte: start,
          lte: end,
        },
        ...(roomId ? { roomId } : {}),
      },
      include: {
        film: true,
        room: true,
        sessionSeats: true,
      },
      orderBy: [{ startsAt: "asc" }, { room: { name: "asc" } }],
    });
  }
}

export const defaultOccupancyRepository = new PrismaOccupancyRepository();
