import { rawPrisma } from "@/shared/db/prisma";
import type { CreateFilmInput, UpdateFilmInput } from "./film-schema";

export class FilmNotFoundError extends Error {
  constructor(message = "Filme nao encontrado no catalogo deste cinema.") {
    super(message);
    this.name = "FilmNotFoundError";
  }
}

export class FilmInUseError extends Error {
  constructor(message = "Nao e possivel excluir o filme pois existem sessoes vinculadas.") {
    super(message);
    this.name = "FilmInUseError";
  }
}

/**
 * Lista os filmes cadastrados para o cinema (tenant) com suporte a busca textual
 */
export async function listFilms(tenantId: string, search?: string) {
  return rawPrisma.film.findMany({
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
}

/**
 * Obtem os detalhes de um filme especifico garantindo isolamento por tenant
 */
export async function getFilmById(id: string, tenantId: string) {
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

  if (!film) {
    throw new FilmNotFoundError();
  }

  return film;
}

/**
 * Cria um novo filme no catalogo do cinema (AC-8, TC-8)
 */
export async function createFilm(data: CreateFilmInput, tenantId: string) {
  return rawPrisma.film.create({
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
}

/**
 * Atualiza os dados de um filme existente no catalogo
 */
export async function updateFilm(id: string, data: UpdateFilmInput, tenantId: string) {
  // Garante que o filme existe e pertence ao tenant antes de atualizar
  await getFilmById(id, tenantId);

  return rawPrisma.film.update({
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
}

/**
 * Remove um filme do catalogo caso nao haja sessoes vinculadas
 */
export async function deleteFilm(id: string, tenantId: string) {
  const film = await getFilmById(id, tenantId);

  const sessionsCount = await rawPrisma.session.count({
    where: {
      filmId: id,
      tenantId,
    },
  });

  if (sessionsCount > 0) {
    throw new FilmInUseError(
      `O filme "${film.title}" possui ${sessionsCount} sessao(oes) vinculada(s) e nao pode ser excluido.`
    );
  }

  return rawPrisma.film.delete({
    where: { id },
  });
}

export const FilmService = {
  listFilms,
  getFilmById,
  createFilm,
  updateFilm,
  deleteFilm,
};
