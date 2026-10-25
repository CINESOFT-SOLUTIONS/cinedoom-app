import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FilmModal } from "@/components/home/film-modal";
import type { FilmItem } from "@/components/home/types";

describe("Organização das Sessões no Modal do Filme (Padrão CineSIS no CineDoom)", () => {
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
      {
        id: "sess-02",
        startsAt: "2026-10-25T21:30:00.000Z",
        price: 42,
        status: "OPEN",
        room: { id: "r-1", name: "Sala 1 - CLÁSSICA", capacity: 120 },
      },
      {
        id: "sess-03",
        startsAt: "2026-10-25T20:00:00.000Z",
        price: 54,
        status: "OPEN",
        room: { id: "r-3", name: "Sala 3 - IMAX", capacity: 120 },
      },
      {
        id: "sess-04",
        startsAt: "2026-10-25T22:15:00.000Z",
        price: 60,
        status: "OPEN",
        room: { id: "r-4", name: "Sala 4 - VIP", capacity: 60 },
      },
    ],
  };

  const testDate = new Date("2026-10-25T12:00:00Z");

  it("exibe as salas separadamente com seus nomes canônicos e categorias de experiência", () => {
    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: mockFilm,
        initialTab: "sessions",
        selectedDate: testDate,
        onClose: () => { },
      })
    );

    // Nomes das salas exibidos separadamente
    expect(html).toContain("Sala 1");
    expect(html).toContain("Sala 3");
    expect(html).toContain("Sala 4");

    // Badges das categorias de experiência
    expect(html).toContain("CLÁSSICA");
    expect(html).toContain("IMAX");
    expect(html).toContain("VIP");
  });

  it("exibe os horários em botões compactos com link direto para seleção de assentos", () => {
    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: mockFilm,
        initialTab: "sessions",
        selectedDate: testDate,
        onClose: () => { },
      })
    );

    // Links diretos para /portal/sessoes/[sessId]
    expect(html).toContain("/portal/sessoes/sess-01");
    expect(html).toContain("/portal/sessoes/sess-02");
    expect(html).toContain("/portal/sessoes/sess-03");
    expect(html).toContain("/portal/sessoes/sess-04");
  });

  it("NÃO exibe preços nos botões de horário (regra obrigatória de interface)", () => {
    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: mockFilm,
        initialTab: "sessions",
        selectedDate: testDate,
        onClose: () => { },
      })
    );

    // Não deve conter valores monetários nos botões
    expect(html).not.toContain("R$ 42");
    expect(html).not.toContain("R$ 54");
    expect(html).not.toContain("R$ 60");
    expect(html).not.toContain("R$");
  });

  it("exibe mensagem adequada quando não há sessões disponíveis para a data selecionada", () => {
    const filmWithoutSessionsOnDate: FilmItem = {
      ...mockFilm,
      sessions: [
        {
          id: "sess-future",
          startsAt: "2026-11-10T19:00:00.000Z", // data distante
          price: 40,
          status: "OPEN",
          room: { id: "r-1", name: "Sala 1 - CLÁSSICA", capacity: 120 },
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: filmWithoutSessionsOnDate,
        initialTab: "sessions",
        selectedDate: testDate,
        onClose: () => { },
      })
    );

    // Mensagem de ausência de sessões
    expect(html).toContain("Nenhuma sessão disponível para");
  });

  it("remove o botão redundante 'Ver Horários e Reservar' na aba Sinopse & Detalhes preservando os dados informativos", () => {
    const html = renderToStaticMarkup(
      React.createElement(FilmModal, {
        film: mockFilm,
        initialTab: "details",
        selectedDate: testDate,
        onClose: () => { },
      })
    );

    // Botão redundante NÃO deve existir
    expect(html).not.toContain("Ver Horários e Reservar");

    // Metadados preservados na íntegra
    expect(html).toContain("Paul Atreides se une a Chani");
    expect(html).toContain("Ficção científica");
    expect(html).toContain("166 min");
    expect(html).toContain("Denis Villeneuve");
    expect(html).toContain("Não recomendado para menores de 14 anos");
  });
});
