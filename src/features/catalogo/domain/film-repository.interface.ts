import type { CreateFilmInput, UpdateFilmInput } from "../application/film.schema";

export interface FilmWithSessionsCount {
  id: string;
  tenantId: string;
  title: string;
  durationMinutes: number;
  director: string | null;
  rating: string | null;
  synopsis: string | null;
  posterUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    sessions: number;
  };
  sessions?: any[];
}

/**
 * Contrato de persistencia para o Dominio de Filmes (Clean Architecture / Repository Pattern)
 */
export interface IFilmRepository {
  findMany(tenantId: string, search?: string): Promise<FilmWithSessionsCount[]>;
  findById(id: string, tenantId: string): Promise<FilmWithSessionsCount | null>;
  create(tenantId: string, data: CreateFilmInput): Promise<FilmWithSessionsCount>;
  update(id: string, data: UpdateFilmInput): Promise<FilmWithSessionsCount>;
  delete(id: string): Promise<FilmWithSessionsCount>;
  countSessions(filmId: string, tenantId: string): Promise<number>;
  findDefaultActiveTenantId(): Promise<string | null>;
  findCatalogWithUpcomingSessions(tenantId: string): Promise<any[]>;
}
