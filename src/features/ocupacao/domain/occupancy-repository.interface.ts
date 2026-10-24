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

export interface IOccupancyRepository {
  findSessionsWithOccupancy(
    tenantId: string,
    start: Date,
    end: Date,
    roomId?: string
  ): Promise<any[]>;
}
