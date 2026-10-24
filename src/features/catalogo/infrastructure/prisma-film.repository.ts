import { rawPrisma } from "@/shared/db/prisma";
import type {
  IFilmRepository,
  FilmWithSessionsCount,
} from "../domain/film-repository.interface";
import type {
  CreateFilmInput,
  UpdateFilmInput,
} from "../application/film.schema";

/**
 * Implementacao concreta do IFilmRepository baseada em Prisma Client
 */
export class PrismaFilmRepository implements IFilmRepository {
  async findMany(tenantId: string, search?: string): Promise<FilmWithSessionsCount[]> {
    const films = await rawPrisma.film.findMany({
      where: {
        tenantId,
        ...(search && search.trim().length > 0
          ? {
              title: {
                contains: search.trim(),
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    return films as unknown as FilmWithSessionsCount[];
  }

  async findById(id: string, tenantId: string): Promise<FilmWithSessionsCount | null> {
    const film = await rawPrisma.film.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        sessions: {
          orderBy: { startsAt: "asc" },
        },
      },
    });

    return (film as unknown as FilmWithSessionsCount) || null;
  }

  async create(tenantId: string, data: CreateFilmInput): Promise<FilmWithSessionsCount> {
    const film = await rawPrisma.film.create({
      data: {
        tenantId,
        title: data.title,
        durationMinutes: data.durationMinutes,
        director: data.director ?? null,
        rating: data.rating ?? null,
        synopsis: data.synopsis ?? null,
        posterUrl: data.posterUrl ?? null,
      },
    });

    return film as unknown as FilmWithSessionsCount;
  }

  async update(id: string, data: UpdateFilmInput): Promise<FilmWithSessionsCount> {
    const film = await rawPrisma.film.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.director !== undefined ? { director: data.director } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.synopsis !== undefined ? { synopsis: data.synopsis } : {}),
        ...(data.posterUrl !== undefined ? { posterUrl: data.posterUrl } : {}),
      },
    });

    return film as unknown as FilmWithSessionsCount;
  }

  async delete(id: string): Promise<FilmWithSessionsCount> {
    const film = await rawPrisma.film.delete({
      where: { id },
    });

    return film as unknown as FilmWithSessionsCount;
  }

  async countSessions(filmId: string, tenantId: string): Promise<number> {
    return rawPrisma.session.count({
      where: {
        filmId,
        tenantId,
      },
    });
  }
}

export const defaultFilmRepository = new PrismaFilmRepository();
