import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getPrimaryGenre,
  formatDuration,
  formatFilmMetaLine,
} from "@/components/home/film-utils";
import { FilmCard } from "@/components/home/film-card";
import type { FilmItem } from "@/components/home/types";

describe("Padronização e Consistência dos Metadados dos Filmes (Ajuste de Consistência)", () => {
  describe("1. Utilitário getPrimaryGenre", () => {
    it("deve retornar o gênero único formatado em Sentence Case", () => {
      expect(getPrimaryGenre("Ação")).toBe("Ação");
      expect(getPrimaryGenre("animação")).toBe("Animação");
      expect(getPrimaryGenre("COMÉDIA")).toBe("Comédia");
    });

    it("deve extrair o gênero cinematográfico principal quando múltiplos gêneros existirem (delimitador •)", () => {
      expect(getPrimaryGenre("Ficção Científica • Aventura")).toBe("Ficção científica");
      expect(getPrimaryGenre("Drama Histórico • Biografia")).toBe("Drama histórico");
      expect(getPrimaryGenre("Romance • Fantasia • Comédia")).toBe("Romance");
    });

    it("deve suportar diferentes delimitadores comuns (·, /, ,, ;)", () => {
      expect(getPrimaryGenre("Aventura / Ação")).toBe("Aventura");
      expect(getPrimaryGenre("Suspense, Terror")).toBe("Suspense");
      expect(getPrimaryGenre("Fantasia · Aventura")).toBe("Fantasia");
      expect(getPrimaryGenre("Documentário; Biografia")).toBe("Documentário");
    });

    it("deve retornar null para strings vazias, nulas ou indefinidas sem inventar dados", () => {
      expect(getPrimaryGenre(null)).toBeNull();
      expect(getPrimaryGenre(undefined)).toBeNull();
      expect(getPrimaryGenre("")).toBeNull();
      expect(getPrimaryGenre("   ")).toBeNull();
    });
  });

  describe("2. Utilitário formatDuration", () => {
    it("deve formatar duração em minutos com sufixo padronizado 'min'", () => {
      expect(formatDuration(142)).toBe("142 min");
      expect(formatDuration(166)).toBe("166 min");
      expect(formatDuration(96)).toBe("96 min");
      expect(formatDuration(180.4)).toBe("180 min");
    });

    it("deve retornar null para valores ausentes, zero ou inválidos sem fallback falso", () => {
      expect(formatDuration(null)).toBeNull();
      expect(formatDuration(undefined)).toBeNull();
      expect(formatDuration(0)).toBeNull();
      expect(formatDuration(-10)).toBeNull();
      expect(formatDuration(NaN)).toBeNull();
    });
  });

  describe("3. Linha de Metadados: formatFilmMetaLine", () => {
    it("deve formatar [Gênero principal] · [Duração] para cards com dados completos", () => {
      const line1 = formatFilmMetaLine({ genre: "Ação", duration: 142 });
      expect(line1).toBe("Ação · 142 min");

      const line2 = formatFilmMetaLine({
        genre: "Ficção Científica • Aventura",
        duration: 166,
      });
      expect(line2).toBe("Ficção científica · 166 min");
    });

    it("deve omitir o gênero quando ausente e exibir apenas a duração", () => {
      const line = formatFilmMetaLine({
        genre: null,
        duration: 166,
      });
      expect(line).toBe("166 min");
      expect(line).not.toContain("·");
    });

    it("deve omitir a duração quando ausente e exibir apenas o gênero principal", () => {
      const line = formatFilmMetaLine({
        genre: "Drama Histórico • Biografia",
        duration: null,
      });
      expect(line).toBe("Drama histórico");
      expect(line).not.toContain("·");
      expect(line).not.toContain("min");
    });

    it("deve retornar string vazia quando ambos estiverem ausentes sem inventar dados", () => {
      const line = formatFilmMetaLine({
        genre: null,
        duration: null,
      });
      expect(line).toBe("");
    });

    it("NUNCA deve substituir gênero ausente por diretor, produtor ou elenco", () => {
      // Simula um filme que possui diretor mas não possui gênero
      const filmWithDirectorOnly = {
        director: "Denis Villeneuve",
        genre: undefined,
        duration: 166,
      };

      const line = formatFilmMetaLine(filmWithDirectorOnly);
      expect(line).toBe("166 min");
      expect(line).not.toContain("Denis Villeneuve");
      expect(line).not.toContain("Cinema");
    });
  });

  describe("4. Renderização do Card de Filme e Sobreposição de Hover", () => {
    const baseFilm: FilmItem = {
      id: "film-01",
      title: "Duna: Parte Dois",
      director: "Denis Villeneuve",
      duration: 166,
      genre: "Ficção Científica • Aventura",
      classification: "14",
      posterUrl: "/posters/duna2.jpg",
      sessions: [
        {
          id: "sess-01",
          startsAt: "2026-10-25T19:00:00.000Z",
          price: 42,
          status: "OPEN",
          room: { id: "r-1", name: "Sala 3 - IMAX Laser", capacity: 120 },
        },
      ],
    };

    it("renderiza o card com dados completos seguindo a ordem e separador oficial", () => {
      const html = renderToStaticMarkup(React.createElement(FilmCard, { film: baseFilm }));

      // Título
      expect(html).toContain("Duna: Parte Dois");
      // Metadados abaixo do pôster: Gênero principal · Duração
      expect(html).toContain("Ficção científica · 166 min");
      // Botões padronizados no hover
      expect(html).toContain("Ver sessões");
      expect(html).toContain("Detalhes");
      // Não deve exibir diretor como gênero na linha de metadados
      expect(html).not.toContain("Denis Villeneuve · 166 min");
    });

    it("renderiza card com dados incompletos (sem gênero) omitindo o gênero sem alterar estrutura", () => {
      const filmWithoutGenre: FilmItem = {
        ...baseFilm,
        genre: undefined,
      };

      const html = renderToStaticMarkup(React.createElement(FilmCard, { film: filmWithoutGenre }));

      expect(html).toContain("166 min");
      expect(html).not.toContain("Denis Villeneuve ·");
      expect(html).not.toContain("Filme em Cartaz");
      expect(html).toContain("Ver sessões");
      expect(html).toContain("Detalhes");
    });

    it("renderiza card com dados incompletos (sem duração) omitindo a duração", () => {
      const filmWithoutDuration: FilmItem = {
        ...baseFilm,
        duration: 0, // inválido/ausente
      };

      const html = renderToStaticMarkup(React.createElement(FilmCard, { film: filmWithoutDuration }));

      expect(html).toContain("Ficção científica");
      expect(html).not.toContain("· 0 min");
      expect(html).not.toContain("·");
    });

    it("preserva a altura fixa do título min-h-[2.5rem] e line-clamp-2 para títulos longos", () => {
      const filmWithLongTitle: FilmItem = {
        ...baseFilm,
        title: "Oppenheimer: O Triunfo e a Tragédia do Projeto Manhattan Durante a Segunda Guerra",
      };

      const html = renderToStaticMarkup(React.createElement(FilmCard, { film: filmWithLongTitle }));

      expect(html).toContain("min-h-[2.5rem]");
      expect(html).toContain("line-clamp-2");
    });

    it("garante que a sobreposição de hover possui gênero, duração, botão 'Ver sessões' e botão 'Detalhes'", () => {
      const html = renderToStaticMarkup(React.createElement(FilmCard, { film: baseFilm }));

      // Ordem da sobreposição de hover:
      // 1. Gênero principal
      expect(html).toContain("Ficção científica");
      // 2. Duração
      expect(html).toContain("166 min");
      // 3. Botão principal
      expect(html).toContain("Ver sessões");
      // 4. Botão secundário
      expect(html).toContain("Detalhes");
    });
  });
});
