import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  EXPERIENCE_CATEGORIES,
  PROGRAMACAO_FILTERS,
  EXPERIENCES_DATA,
  getRoomExperienceCategory,
  getRoomDisplayName,
  getRoomWithExperience,
  matchesProgramacaoFilter,
} from "@/shared/experiences";
import { FilmFilters } from "@/components/home/film-filters";

describe("Padronização de Experiências de Salas e Filtros (CineDoom)", () => {
  describe("1. Nomenclatura e Categorias Principais", () => {
    it("deve conter exatamente as 3 categorias oficiais de experiência", () => {
      expect(EXPERIENCE_CATEGORIES).toEqual(["CLÁSSICA", "IMAX", "VIP"]);
    });

    it("não deve conter nomes misturados ou categorias espúrias como Confort independente", () => {
      expect(EXPERIENCE_CATEGORIES).not.toContain("CONFORT");
      expect(EXPERIENCE_CATEGORIES).not.toContain("Confort");
      expect(EXPERIENCE_CATEGORIES).not.toContain("Tradicional Confort");
      expect(EXPERIENCE_CATEGORIES).not.toContain("IMAX Laser");
      expect(EXPERIENCE_CATEGORIES).not.toContain("VIP Prime Lounge");
    });
  });

  describe("2. Especificações e Capacidades Reais das Salas", () => {
    it("deve mapear corretamente a experiência CLÁSSICA para as Salas 1 e 2 com 120 lugares", () => {
      const classica = EXPERIENCES_DATA["CLÁSSICA"];
      expect(classica.title).toBe("CLÁSSICA");
      expect(classica.rooms).toBe("Salas 1 e 2");
      expect(classica.roomNumbers).toEqual([1, 2]);
      expect(classica.capacityPerRoom).toBe(120);
      expect(classica.totalCapacity).toBe(240);
      expect(classica.features).toHaveLength(3);
      expect(classica.features).toContain("Tela ampla de alta definição");
      expect(classica.features).toContain("Som de qualidade");
      expect(classica.features).toContain("Poltronas confortáveis e espaçosas");
      expect(classica.shortDescription).toBe(
        "Aproveite seus filmes favoritos em uma sala projetada para proporcionar conforto e uma ótima experiência audiovisual, com tela ampla, som de qualidade e poltronas espaçosas."
      );
    });

    it("deve mapear corretamente a experiência IMAX para a Sala 3 com 120 lugares", () => {
      const imax = EXPERIENCES_DATA["IMAX"];
      expect(imax.title).toBe("IMAX");
      expect(imax.rooms).toBe("Sala 3");
      expect(imax.roomNumbers).toEqual([3]);
      expect(imax.capacityPerRoom).toBe(120);
      expect(imax.totalCapacity).toBe(120);
      expect(imax.features).toHaveLength(3);
      expect(imax.features).toContain("Imagens de alta nitidez");
      expect(imax.features).toContain("Som potente que envolve você");
      expect(imax.features.some((f) => f.includes("Tela de grandes dimensões"))).toBe(true);
      expect(imax.shortDescription).toContain("Viva o cinema em outra escala");
    });

    it("deve mapear corretamente a experiência VIP para a Sala 4 com 60 lugares", () => {
      const vip = EXPERIENCES_DATA["VIP"];
      expect(vip.title).toBe("VIP");
      expect(vip.rooms).toBe("Sala 4");
      expect(vip.roomNumbers).toEqual([4]);
      expect(vip.capacityPerRoom).toBe(60);
      expect(vip.totalCapacity).toBe(60);
      expect(vip.features).toHaveLength(3);
      expect(vip.features).toContain("Poltronas reclináveis");
      expect(vip.features).toContain("Mesas individuais de apoio");
      expect(vip.features).toContain("Ambiente para relaxar no seu próprio ritmo");
      expect(vip.shortDescription).toBe(
        "Desfrute de uma sessão mais confortável em poltronas reclináveis, com mesas individuais para apoiar suas bebidas e petiscos. Um ambiente pensado para você relaxar e aproveitar o filme no seu próprio ritmo."
      );
    });
  });

  describe("3. Mapeamento de Salas e Nomenclatura Canônica", () => {
    it("deve mapear nomes de salas numéricas e legadas para a categoria CLÁSSICA", () => {
      expect(getRoomExperienceCategory("Sala 1")).toBe("CLÁSSICA");
      expect(getRoomExperienceCategory("Sala 2")).toBe("CLÁSSICA");
      expect(getRoomExperienceCategory("Sala 1 - Confort")).toBe("CLÁSSICA");
      expect(getRoomExperienceCategory("Sala 2 - Tradicional")).toBe("CLÁSSICA");
      expect(getRoomExperienceCategory("1")).toBe("CLÁSSICA");
      expect(getRoomExperienceCategory("2")).toBe("CLÁSSICA");
    });

    it("deve mapear nomes de sala 3 ou com termo IMAX para a categoria IMAX", () => {
      expect(getRoomExperienceCategory("Sala 3")).toBe("IMAX");
      expect(getRoomExperienceCategory("Sala 3 - IMAX Laser")).toBe("IMAX");
      expect(getRoomExperienceCategory("Sala IMAX")).toBe("IMAX");
      expect(getRoomExperienceCategory("3")).toBe("IMAX");
    });

    it("deve mapear nomes de sala 4 ou com termo VIP para a categoria VIP", () => {
      expect(getRoomExperienceCategory("Sala 4")).toBe("VIP");
      expect(getRoomExperienceCategory("Sala 4 - VIP Prime")).toBe("VIP");
      expect(getRoomExperienceCategory("Sala VIP Lounge")).toBe("VIP");
      expect(getRoomExperienceCategory("4")).toBe("VIP");
    });

    it("deve formatar o nome limpo da sala através de getRoomDisplayName", () => {
      expect(getRoomDisplayName("Sala 1 - Confort")).toBe("Sala 1");
      expect(getRoomDisplayName("Sala 2 - Tradicional")).toBe("Sala 2");
      expect(getRoomDisplayName("Sala 3 - IMAX Laser")).toBe("Sala 3");
      expect(getRoomDisplayName("Sala 4 - VIP Prime")).toBe("Sala 4");
      expect(getRoomDisplayName("Sala 1")).toBe("Sala 1");
    });

    it("deve formatar 'Sala X — [Categoria]' através de getRoomWithExperience", () => {
      expect(getRoomWithExperience("Sala 1 - Confort")).toBe("Sala 1 — CLÁSSICA");
      expect(getRoomWithExperience("Sala 2 - Confort")).toBe("Sala 2 — CLÁSSICA");
      expect(getRoomWithExperience("Sala 3 - IMAX Laser")).toBe("Sala 3 — IMAX");
      expect(getRoomWithExperience("Sala 4 - VIP Prime")).toBe("Sala 4 — VIP");
    });
  });

  describe("4. Filtros da Programação", () => {
    it("deve possuir exatamente os filtros 'Todos', 'CLÁSSICA', 'IMAX' e 'VIP'", () => {
      expect(PROGRAMACAO_FILTERS).toEqual(["Todos", "CLÁSSICA", "IMAX", "VIP"]);
    });

    it("deve validar matchesProgramacaoFilter para todas as combinações", () => {
      // Filtro Todos deve aceitar qualquer sala
      expect(matchesProgramacaoFilter("Sala 1", "Todos")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 3", "Todos")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 4", "Todos")).toBe(true);

      // Filtro CLÁSSICA
      expect(matchesProgramacaoFilter("Sala 1", "CLÁSSICA")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 2", "CLÁSSICA")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 1 - Confort", "CLÁSSICA")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 3", "CLÁSSICA")).toBe(false);
      expect(matchesProgramacaoFilter("Sala 4", "CLÁSSICA")).toBe(false);

      // Filtro IMAX
      expect(matchesProgramacaoFilter("Sala 3", "IMAX")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 3 - IMAX Laser", "IMAX")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 1", "IMAX")).toBe(false);
      expect(matchesProgramacaoFilter("Sala 4", "IMAX")).toBe(false);

      // Filtro VIP
      expect(matchesProgramacaoFilter("Sala 4", "VIP")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 4 - VIP Prime", "VIP")).toBe(true);
      expect(matchesProgramacaoFilter("Sala 1", "VIP")).toBe(false);
      expect(matchesProgramacaoFilter("Sala 3", "VIP")).toBe(false);
    });
  });

  describe("5. Renderização do Componente FilmFilters", () => {
    it("deve renderizar o seletor de datas e o campo de busca sem filtros de formato de sala", () => {
      const html = renderToStaticMarkup(
        React.createElement(FilmFilters, {
          dateTabs: [
            { index: 0, dayName: "Hoje", dayNumber: "24/10", date: new Date() },
          ],
          selectedDay: 0,
          onSelectDay: () => { },
          searchQuery: "",
          onSearchChange: () => { },
        })
      );

      expect(html).toContain("Hoje");
      expect(html).toContain("24/10");
      expect(html).toContain("Buscar filme em cartaz...");
      expect(html).not.toContain("CLÁSSICA");
      expect(html).not.toContain("TODOS");
      expect(html).not.toContain("CONFORT");
      expect(html).not.toContain("Confort");
    });
  });
});
