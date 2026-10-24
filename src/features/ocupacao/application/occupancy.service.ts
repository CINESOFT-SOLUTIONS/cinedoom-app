import type {
  IOccupancyRepository,
  OccupancySession,
} from "../domain/occupancy-repository.interface";
import { defaultOccupancyRepository } from "../infrastructure/prisma-occupancy.repository";

export { OccupancySession };

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export class OccupancyServiceClass {
  constructor(
    private occupancyRepo: IOccupancyRepository = defaultOccupancyRepository
  ) {}

  async getOccupancyPanel(
    tenantId: string,
    filters?: { roomId?: string; date?: Date }
  ): Promise<OccupancySession[]> {
    const targetDate = filters?.date ?? new Date();
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const sessions = await this.occupancyRepo.findSessionsWithOccupancy(
      tenantId,
      start,
      end,
      filters?.roomId
    );

    return sessions.map((session: any) => {
      const capacity = session.room.capacity || session.sessionSeats.length || 0;
      let sold = 0;
      let reserved = 0;
      let blocked = 0;
      let available = 0;

      for (const seat of session.sessionSeats) {
        if (seat.status === "SOLD") sold++;
        else if (seat.status === "RESERVED") reserved++;
        else if (seat.status === "BLOCKED") blocked++;
        else available++;
      }

      const occupancyPercent =
        capacity > 0 ? Math.round((sold / capacity) * 1000) / 10 : 0;

      return {
        sessionId: session.id,
        film: {
          id: session.film.id,
          title: session.film.title,
          posterUrl: session.film.posterUrl,
          durationMinutes: session.film.durationMinutes,
        },
        room: {
          id: session.room.id,
          name: session.room.name,
          capacity,
        },
        startsAt: session.startsAt,
        status: session.status,
        capacity,
        sold,
        reserved,
        blocked,
        available,
        occupancyPercent,
      };
    });
  }
}

export const OccupancyService = new OccupancyServiceClass();
export const getOccupancyPanel = OccupancyService.getOccupancyPanel.bind(OccupancyService);
