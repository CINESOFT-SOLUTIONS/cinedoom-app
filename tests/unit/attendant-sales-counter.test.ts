import React from "react";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AttendantSalesCounter } from "@/components/attendant/attendant-sales-counter";
import type { FilmItem } from "@/components/home/types";

// Mock next/image para ambiente SSR de teste
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill: _fill, unoptimized: _unoptimized, priority: _priority, ...rest } = props;
    return React.createElement("img", rest);
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "attendant-1", name: "Atendente Operacional", role: "ATENDENTE" } },
    status: "authenticated",
  }),
}));

describe("Balcão de Vendas do Atendente de Bilheteria", () => {
  const now = new Date();
  const todayHour1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 20).toISOString();
  const todayHour2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0).toISOString();
  const futureDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 19, 0).toISOString();

  const mockFilms: FilmItem[] = [
    {
      id: "film-01",
      title: "Acompanhante Perfeita",
      duration: 110,
      classification: "14",
      genre: "Suspense • Drama",
      posterUrl: "/posters/acompanhante.jpg",
      sessions: [
        {
          id: "sess-01",
          startsAt: todayHour1,
          price: 30,
          status: "OPEN",
          room: { id: "r-03", name: "Sala 03", capacity: 120 },
        },
        {
          id: "sess-02",
          startsAt: todayHour2,
          price: 30,
          status: "OPEN",
          room: { id: "r-03", name: "Sala 03", capacity: 120 },
        },
      ],
    },
    {
      id: "film-02",
      title: "Filme Futuro Sem Sessao Hoje",
      duration: 90,
      classification: "L",
      genre: "Animação",
      posterUrl: "/posters/futuro.jpg",
      sessions: [
        {
          id: "sess-03",
          startsAt: futureDate,
          price: 30,
          status: "OPEN",
          room: { id: "r-01", name: "Sala 01", capacity: 120 },
        },
      ],
    },
  ];

  it("exibe o título principal canônico 'Escolha a sessão para um filme'", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttendantSalesCounter, { films: mockFilms, loading: false })
    );

    expect(html).toContain("Escolha a sessão para um filme");
    expect(html).toContain("Balcão de Vendas CineDoom");
  });

  it("organiza os filmes em cards com pôster à esquerda e sessões à direita", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttendantSalesCounter, { films: mockFilms, loading: false })
    );

    // Identificação do filme
    expect(html).toContain("Acompanhante Perfeita");
    expect(html).toContain("Sessões de hoje");
    expect(html).toContain("Sala 03");

    // Horários das sessões em botões individuais
    expect(html).toContain("13:20");
    expect(html).toContain("15:00");

    // Indicadores compactos de formato e idioma
    expect(html).toContain("2D");
  });

  it("inclui o botão secundário 'Mais datas' com ícone de pesquisa abaixo do pôster", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttendantSalesCounter, { films: mockFilms, loading: false })
    );

    expect(html).toContain("Mais datas");
  });

  it("apresenta mensagem 'Nenhuma sessão para hoje' para filmes sem sessões no dia atual", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttendantSalesCounter, { films: mockFilms, loading: false })
    );

    expect(html).toContain("Filme Futuro Sem Sessao Hoje");
    expect(html).toContain("Nenhuma sessão para hoje");
  });

  it("abre o menu de login/perfil exclusivamente ao clicar e não ao passar o mouse (sem onMouseEnter/onMouseLeave)", () => {
    const authProfileMenuPath = path.resolve(
      process.cwd(),
      "src/components/auth-profile-menu.tsx"
    );
    const content = fs.readFileSync(authProfileMenuPath, "utf-8");

    expect(content).not.toContain("onMouseEnter");
    expect(content).not.toContain("onMouseLeave");
    expect(content).toContain("onClick={() => setIsOpen");
  });
});
