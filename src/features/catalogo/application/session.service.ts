import { SessionStatus } from "@prisma/client";
import type {
  ISessionRepository,
  ListSessionsFilter,
} from "../domain/session-repository.interface";
import type { IFilmRepository } from "../domain/film-repository.interface";
import type { IRoomRepository } from "../domain/room-repository.interface";
import { defaultSessionRepository } from "../infrastructure/prisma-session.repository";
import { defaultFilmRepository } from "../infrastructure/prisma-film.repository";
import { defaultRoomRepository } from "../infrastructure/prisma-room.repository";
import type {
  CreateSessionInput,
  UpdateSessionInput,
} from "./session.schema";

export class SessionNotFoundError extends Error {
  constructor(message = "Sessao nao encontrada neste cinema.") {
    super(message);
    this.name = "SessionNotFoundError";
  }
}

export class SessionFilmNotFoundError extends Error {
  constructor(message = "Filme informado nao encontrado neste cinema.") {
    super(message);
    this.name = "SessionFilmNotFoundError";
  }
}

export class SessionRoomNotFoundError extends Error {
  constructor(message = "Sala informada nao encontrada neste cinema.") {
    super(message);
    this.name = "SessionRoomNotFoundError";
  }
}

export class SessionScheduleConflictError extends Error {
  constructor(message = "Conflito de horario: a sala informada ja possui outra sessao agendada neste intervalo.") {
    super(message);
    this.name = "SessionScheduleConflictError";
  }
}

export class SessionHasTicketsError extends Error {
  constructor(message = "Nao e possivel excluir a sessao pois ja existem ingressos vendidos ou reservas ativas.") {
    super(message);
    this.name = "SessionHasTicketsError";
  }
}

/**
 * Servico de Aplicacao para Sessoes Cinematograficas (TASK-8 / ADR-007)
 * Desacoplado da camada de dados via ISessionRepository, IFilmRepository e IRoomRepository
 */
export class SessionServiceClass {
  constructor(
    private sessionRepo: ISessionRepository = defaultSessionRepository,
    private filmRepo: IFilmRepository = defaultFilmRepository,
    private roomRepo: IRoomRepository = defaultRoomRepository
  ) {}

  /**
   * Cria sessao cinematografica com verificacao de conflito de horario e pre-populacao atomica (ADR-007)
   */
  async createSession(input: CreateSessionInput, tenantId: string) {
    // 1. Validar existencia do Filme
    const film = await this.filmRepo.findById(input.filmId, tenantId);
    if (!film) {
      throw new SessionFilmNotFoundError();
    }

    // 2. Validar existencia da Sala
    const room = await this.roomRepo.findById(input.roomId, tenantId);
    if (!room) {
      throw new SessionRoomNotFoundError();
    }

    // 3. Verificacao de colisão de horarios
    const newStart = input.startsAt instanceof Date ? input.startsAt : new Date(input.startsAt);
    const newEnd = new Date(newStart.getTime() + film.durationMinutes * 60 * 1000);

    const existingSessions = await this.sessionRepo.findConflicting(input.roomId, tenantId);

    for (const existing of existingSessions) {
      const existStart = new Date(existing.startsAt);
      const existEnd = new Date(existStart.getTime() + existing.film.durationMinutes * 60 * 1000);

      // Conflito ocorre se [newStart, newEnd] sobrepor [existStart, existEnd]
      const overlaps = newStart < existEnd && newEnd > existStart;
      if (overlaps) {
        throw new SessionScheduleConflictError();
      }
    }

    // 4. Criacao transacional da sessao e pre-populacao de SessionSeat (ADR-007)
    return this.sessionRepo.createWithPrepopulatedSeats(tenantId, input, newStart);
  }

  /**
   * Lista sessoes cinematograficas do tenant com filtros opcionais
   */
  async listSessions(tenantId: string, options?: ListSessionsFilter) {
    return this.sessionRepo.findMany(tenantId, options);
  }

  /**
   * Busca detalhes completos da sessao e o mapa de assentos pre-populados
   */
  async getSessionById(id: string, tenantId: string) {
    const session = await this.sessionRepo.findById(id, tenantId);
    if (!session) {
      throw new SessionNotFoundError();
    }
    return session;
  }

  /**
   * Atualiza status ou campos permitidos da sessao
   */
  async updateSession(id: string, input: UpdateSessionInput, tenantId: string) {
    await this.getSessionById(id, tenantId);

    const updateData: any = {};
    if (input.price !== undefined) {
      updateData.price = input.price;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.startsAt !== undefined) {
      updateData.startsAt = input.startsAt instanceof Date ? input.startsAt : new Date(input.startsAt);
    }

    return this.sessionRepo.update(id, updateData);
  }

  /**
   * Exclui sessao desde que nao possua ingressos vendidos ou reservas
   */
  async deleteSession(id: string, tenantId: string) {
    const session = await this.getSessionById(id, tenantId);

    if (
      session._count &&
      (Number(session._count.tickets) > 0 || Number(session._count.reservations) > 0)
    ) {
      throw new SessionHasTicketsError();
    }

    return this.sessionRepo.deleteWithSeats(id, tenantId);
  }
}

export const SessionService = new SessionServiceClass();
export const createSession = SessionService.createSession.bind(SessionService);
export const listSessions = SessionService.listSessions.bind(SessionService);
export const getSessionById = SessionService.getSessionById.bind(SessionService);
export const updateSession = SessionService.updateSession.bind(SessionService);
export const deleteSession = SessionService.deleteSession.bind(SessionService);
