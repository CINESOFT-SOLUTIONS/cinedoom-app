import type { IFilmRepository } from "../domain/film-repository.interface";
import { defaultFilmRepository } from "../infrastructure/prisma-film.repository";
import type { CreateFilmInput, UpdateFilmInput } from "./film.schema";

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
 * Caso de Uso / Servico de Aplicacao para Catálogo de Filmes
 * Rastreabilidade: AC-5, AC-8, TC-8, TC-16, ISO/IEC/IEEE 12207:2021
 * Desacoplado da camada de dados via IFilmRepository
 */
export class FilmServiceClass {
  constructor(private filmRepo: IFilmRepository = defaultFilmRepository) {}

  /**
   * Lista os filmes cadastrados para o cinema (tenant) com suporte a busca textual
   */
  async listFilms(tenantId: string, search?: string) {
    return this.filmRepo.findMany(tenantId, search);
  }

  /**
   * Obtem os detalhes de um filme especifico garantindo isolamento por tenant
   */
  async getFilmById(id: string, tenantId: string) {
    const film = await this.filmRepo.findById(id, tenantId);
    if (!film) {
      throw new FilmNotFoundError();
    }
    return film;
  }

  /**
   * Cria um novo filme no catalogo do cinema (AC-8, TC-8)
   */
  async createFilm(data: CreateFilmInput, tenantId: string) {
    return this.filmRepo.create(tenantId, data);
  }

  /**
   * Atualiza os dados de um filme existente no catalogo
   */
  async updateFilm(id: string, data: UpdateFilmInput, tenantId: string) {
    // Garante que o filme existe e pertence ao tenant antes de atualizar
    await this.getFilmById(id, tenantId);
    return this.filmRepo.update(id, data);
  }

  /**
   * Remove um filme do catalogo caso nao haja sessoes vinculadas
   */
  async deleteFilm(id: string, tenantId: string) {
    const film = await this.getFilmById(id, tenantId);
    const sessionsCount = await this.filmRepo.countSessions(id, tenantId);

    if (sessionsCount > 0) {
      throw new FilmInUseError(
        'O filme "' + film.title + '" possui ' + String(sessionsCount) + ' sessao(oes) vinculada(s) e nao pode ser excluido.'
      );
    }

    return this.filmRepo.delete(id);
  }
}

export const FilmService = new FilmServiceClass();
export const listFilms = FilmService.listFilms.bind(FilmService);
export const getFilmById = FilmService.getFilmById.bind(FilmService);
export const createFilm = FilmService.createFilm.bind(FilmService);
export const updateFilm = FilmService.updateFilm.bind(FilmService);
export const deleteFilm = FilmService.deleteFilm.bind(FilmService);
