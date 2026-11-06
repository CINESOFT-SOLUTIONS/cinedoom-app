import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FilmModal } from "@/components/home/film-modal";
import type { FilmItem } from "@/components/home/types";

describe("Modal de Filme na Tela Inicial (Foco Exclusivo em Sinopse & Detalhes)", () => {
  const mockFilm: FilmItem = {
    id: "film-01",
    title: "Duna: Parte Dois",
    synopsis: "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores.",
    duration: 166,
    genre: "Ficção científica",
    classification: "14",
    director: "Denis Villeneuve",
    posterUrl: "/posters/duna2.jpg",
    sessions: [
      {
        id: "sess-01",
        startsAt: "2026-10-25T19:00:00.000Z",
        price: 42,
        status: "OPEN",
        room: { id: "r-1", name: "Sala 1 - CLÁSSICA", capacity: 120 },
      },
    ],
  };

  it("renderiza o título da seção como 'Sinopse' e exibe a sinopse completa", () => {
    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: mockFilm,
        onClose: () => {},
      })
    );

    // Deve conter o título "Sinopse"
    expect(html).toContain("Sinopse");
    expect(html).toContain("Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores.");
  });

  it("exibe metadados completos (Gênero, Duração, Direção, Classificação) e pôster", () => {
    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: mockFilm,
        onClose: () => {},
      })
    );

    expect(html).toContain("Ficção científica");
    expect(html).toContain("166 min");
    expect(html).toContain("Denis Villeneuve");
    expect(html).toContain("Duna: Parte Dois");
    expect(html).toContain("Não recomendado para menores de 14 anos");
  });

  it("NÃO exibe abas nem a parte antiga de sessões/salas no modal", () => {
    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: mockFilm,
        onClose: () => {},
      })
    );

    // Não deve possuir abas de navegação nem listagem interna de salas/sessões
    expect(html).not.toContain("Horários &amp; Sessões");
    expect(html).not.toContain("Horários & Sessões");
    expect(html).not.toContain("Sala 1 - CLÁSSICA");
    expect(html).not.toContain("Nenhuma sessão disponível");
  });

  it("fornece botão de ação para 'Ver sessões' direcionando ao fluxo oficial /portal/reservas", () => {
    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: mockFilm,
        onClose: () => {},
      })
    );

    expect(html).toContain("Ver sessões");
    expect(html).toContain("/portal/reservas?filmeId=film-01");
  });
});
