import { rawPrisma } from "@/shared/db/prisma";

export interface OccupancySession {
  sessionId: string;
  film: {
    id: string;
    title: string;
    posterUrl: string | null;
    durationMinutes: number;
  };
  room: {
    id: string;
    name: string;
    capacity: number;
  };
  startsAt: Date;
  status: string;
  capacity: number;
  sold: number;
  reserved: number;
  blocked: number;
  available: number;
  occupancyPercent: number;
}

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

export async function getOccupancyPanel(
  tenantId: string,
  filters?: { roomId?: string; date?: Date }
): Promise<OccupancySession[]> {
  const targetDate = filters?.date ?? new Date();
  const start = startOfDay(targetDate);
  const end = endOfDay(targetDate);

  const sessions = await rawPrisma.session.findMany({
    where: {
      tenantId,
      startsAt: {
        gte: start,
        lte: end,
      },
      ...(filters?.roomId ? { roomId: filters.roomId } : {}),
    },
    include: {
      film: true,
      room: true,
      sessionSeats: true,
    },
    orderBy: [{ startsAt: "asc" }, { room: { name: "asc" } }],
  });

  return sessions.map((session) => {
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

export const OccupancyService = {
  getOccupancyPanel,
};
