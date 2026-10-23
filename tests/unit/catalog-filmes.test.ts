import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFilmSchema,
  updateFilmSchema,
  formatZodErrors,
  FilmService,
  FilmNotFoundError,
  FilmInUseError,
} from "@/modules/backoffice";
import { rawPrisma } from "@/shared/db/prisma";
import { NextRequest } from "next/server";
import { GET as getFilmes, POST as postFilmes } from "@/app/api/filmes/route";
import { GET as getFilmById } from "@/app/api/filmes/[id]/route";

// Mock do prisma
vi.mock("@/shared/db/prisma", () => {
  const mockFilm = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockSession = {
    count: vi.fn(),
  };

  return {
    rawPrisma: {
      film: mockFilm,
      session: mockSession,
    },
    prisma: {
      film: mockFilm,
      session: mockSession,
    },
  };
});

// Mock de getServerSession do NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";

describe("Catálogo de Filmes Backoffice (AC-5 / AC-8 / TC-8 / TC-16)", () => {
  const tenantId = "tenant-cinema-alphaville";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validação de Schemas Zod (TC-16)", () => {
    it("deve validar com sucesso um payload válido com todos os campos obrigatórios", () => {
      const validPayload = {
        title: "Duna: Parte Dois",
        durationMinutes: 166,
        director: "Denis Villeneuve",
        rating: "14",
        synopsis: "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança.",
        posterUrl: "/posters/duna2.jpg",
      };

      const result = createFilmSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Duna: Parte Dois");
        expect(result.data.durationMinutes).toBe(166);
      }
    });

    it("deve aceitar interoperabilidade com snake_case duration_minutes e poster_url", () => {
      const snakePayload = {
        title: "Oppenheimer",
        duration_minutes: 180,
        poster_url: "/posters/oppenheimer.jpg",
      };

      const result = createFilmSchema.safeParse(snakePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Oppenheimer");
        expect(result.data.durationMinutes).toBe(180);
        expect(result.data.posterUrl).toBe("/posters/oppenheimer.jpg");
      }
    });

    it("TC-16: rejeita criação quando duration_minutes está ausente e retorna erro por campo", () => {
      const invalidPayload = {
        title: "Duna: Parte Dois",
        // durationMinutes omitido
      };

      const result = createFilmSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatZodErrors(result.error);
        const durationError = errors.find((e) => e.field === "durationMinutes");
        expect(durationError).toBeDefined();
        expect(durationError?.message).toContain("durationMinutes");
      }
    });

    it("rejeita quando a duração for menor ou igual a zero minutos", () => {
      const payloadZero = { title: "Filme Zero", durationMinutes: 0 };
      const payloadNegativo = { title: "Filme Negativo", durationMinutes: -45 };

      const resZero = createFilmSchema.safeParse(payloadZero);
      const resNeg = createFilmSchema.safeParse(payloadNegativo);

      expect(resZero.success).toBe(false);
      expect(resNeg.success).toBe(false);

      if (!resZero.success) {
        const errors = formatZodErrors(resZero.error);
        expect(errors[0].message).toContain("A duracao deve ser maior que 0 minutos");
      }
    });

    it("rejeita quando o título for vazio ou apenas espaços em branco", () => {
      const payloadVazio = { title: "   ", durationMinutes: 120 };
      const result = createFilmSchema.safeParse(payloadVazio);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some((e) => e.field === "title")).toBe(true);
      }
    });

    it("updateFilmSchema permite atualização parcial de campos", () => {
      const partialUpdate = { durationMinutes: 180 };
      const result = updateFilmSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe("FilmService (Operações de Domínio Isoladas por Tenant)", () => {
    it("TC-8: GERENTE cria filme com campos obrigatórios válidos e persiste no tenant correto", async () => {
      const input = {
        title: "Interestelar",
        durationMinutes: 169,
        director: "Christopher Nolan",
        rating: "10",
        synopsis: "Exploradores viajam através de um buraco de minhoca no espaço.",
        posterUrl: null,
      };

      const mockSavedFilm = {
        id: "film-uuid-1",
        tenantId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(rawPrisma.film.create).mockResolvedValue(mockSavedFilm as any);

      const created = await FilmService.createFilm(input, tenantId);

      expect(rawPrisma.film.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          title: "Interestelar",
          durationMinutes: 169,
          director: "Christopher Nolan",
          rating: "10",
          synopsis: "Exploradores viajam através de um buraco de minhoca no espaço.",
          posterUrl: null,
        },
      });
      expect(created.id).toBe("film-uuid-1");
      expect(created.tenantId).toBe(tenantId);
    });

    it("listFilms filtra pelo tenant_id e suporta busca textual case-insensitive", async () => {
      vi.mocked(rawPrisma.film.findMany).mockResolvedValue([]);

      await FilmService.listFilms(tenantId, "Duna");

      expect(rawPrisma.film.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          title: {
            contains: "Duna",
            mode: "insensitive",
          },
        },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { sessions: true } } },
      });
    });

    it("getFilmById lança FilmNotFoundError se o filme não pertencer ao tenant", async () => {
      vi.mocked(rawPrisma.film.findFirst).mockResolvedValue(null);

      await expect(FilmService.getFilmById("film-999", tenantId)).rejects.toThrow(
        FilmNotFoundError
      );
    });

    it("deleteFilm lança FilmInUseError se houver sessões atreladas ao filme", async () => {
      vi.mocked(rawPrisma.film.findFirst).mockResolvedValue({
        id: "film-1",
        title: "Filme em Exibição",
        tenantId,
      } as any);

      vi.mocked(rawPrisma.session.count).mockResolvedValue(3);

      await expect(FilmService.deleteFilm("film-1", tenantId)).rejects.toThrow(
        FilmInUseError
      );
      expect(rawPrisma.film.delete).not.toHaveBeenCalled();
    });
  });

  describe("Route Handlers /api/filmes (Controle de Acesso RBAC & HTTP Status)", () => {
    it("TC-5 / AC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar POST /api/filmes", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/filmes", {
        method: "POST",
        body: JSON.stringify({
          title: "Filme Invasor",
          durationMinutes: 120,
        }),
      });

      const response = await postFilmes(request);
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
      expect(rawPrisma.film.create).not.toHaveBeenCalled();
    });

    it("TC-5 / AC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar GET /api/filmes", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/filmes", {
        method: "GET",
      });

      const response = await getFilmes(request);
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
      expect(rawPrisma.film.findMany).not.toHaveBeenCalled();
    });

    it("TC-16: POST retorna HTTP 422 Unprocessable Entity quando payload for inválido", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/filmes", {
        method: "POST",
        body: JSON.stringify({
          // Falta durationMinutes
          title: "Filme Sem Duração",
        }),
      });

      const response = await postFilmes(request);
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.errors).toBeDefined();
      expect(Array.isArray(json.errors)).toBe(true);
      expect(json.errors.some((e: any) => e.field === "durationMinutes")).toBe(true);
    });

    it("TC-8: GERENTE com payload válido recebe HTTP 201 Created com dados do filme", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      const mockFilm = {
        id: "film-novo-123",
        tenantId,
        title: "O Poderoso Chefão",
        durationMinutes: 175,
        director: "Francis Ford Coppola",
        rating: "14",
        synopsis: "A saga da família Corleone.",
        posterUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(rawPrisma.film.create).mockResolvedValue(mockFilm as any);

      const request = new NextRequest("http://localhost:3000/api/filmes", {
        method: "POST",
        body: JSON.stringify({
          title: "O Poderoso Chefão",
          durationMinutes: 175,
          director: "Francis Ford Coppola",
          rating: "14",
          synopsis: "A saga da família Corleone.",
        }),
      });

      const response = await postFilmes(request);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.id).toBe("film-novo-123");
      expect(json.title).toBe("O Poderoso Chefão");
    });

    it("GET /api/filmes lista os filmes do tenant quando usuário for GERENTE", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.film.findMany).mockResolvedValue([
        { id: "f1", title: "Filme A", durationMinutes: 100, tenantId },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/filmes");
      const response = await getFilmes(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveLength(1);
      expect(json[0].title).toBe("Filme A");
    });

    it("TC-5 / AC-5: ATENDENTE recebe HTTP 403 ao tentar GET /api/filmes/[id]", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/filmes/film-123", {
        method: "GET",
      });

      const response = await getFilmById(request, { params: { id: "film-123" } });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
    });
  });
});
