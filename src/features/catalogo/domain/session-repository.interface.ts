import type { SessionStatus } from "@prisma/client";
import type { CreateSessionInput } from "../application/session.schema";

export interface SessionWithRelations {
  id: string;
  tenantId: string;
  filmId: string;
  roomId: string;
  startsAt: Date;
  price: any;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  film?: any;
  room?: any;
  sessionSeats?: any[];
  _count?: {
    sessionSeats?: number;
    tickets?: number;
    reservations?: number;
  };
  seatsGeneratedCount?: number;
}

export interface ListSessionsFilter {
  filmId?: string;
  roomId?: string;
  date?: string;
  status?: SessionStatus;
}

/**
 * Contrato de persistencia para o Dominio de Sessoes e Assentos de Sessao (Clean Architecture / Repository Pattern)
 */
export interface ISessionRepository {
  findMany(tenantId: string, filter?: ListSessionsFilter): Promise<SessionWithRelations[]>;
  findById(id: string, tenantId: string): Promise<SessionWithRelations | null>;
  findConflicting(
    roomId: string,
    tenantId: string
  ): Promise<{ startsAt: Date; film: { durationMinutes: number } }[]>;
  createWithPrepopulatedSeats(
    tenantId: string,
    input: CreateSessionInput,
    startsAt: Date
  ): Promise<SessionWithRelations>;
  update(id: string, data: any): Promise<SessionWithRelations>;
  deleteWithSeats(id: string, tenantId: string): Promise<SessionWithRelations>;
}
