import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SeatingGrid, type GridSeatItem } from "@/modules/bilheteria";

describe("Componente SeatingGrid - Design System & Estados Cromáticos (TASK-17 / AC-1 / AC-2)", () => {
  const mockSeats: GridSeatItem[] = [
    { id: "s-a1", rowLabel: "A", columnNumber: 1, seatCode: "A1", status: "AVAILABLE", price: 35 },
    { id: "s-a2", rowLabel: "A", columnNumber: 2, seatCode: "A2", status: "AVAILABLE", price: 35 },
    { id: "s-a3", rowLabel: "A", columnNumber: 3, seatCode: "A3", status: "SOLD", price: 35 },
    { id: "s-b1", rowLabel: "B", columnNumber: 1, seatCode: "B1", status: "RESERVED", price: 40 },
    { id: "s-b2", rowLabel: "B", columnNumber: 2, seatCode: "B2", status: "BLOCKED", price: 40 },
  ];

  describe("Estrutura e Elementos Visuais", () => {
    it("renderiza o indicador visual da tela de cinema (TELA / PROJECAO)", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
          showScreen: true,
        })
      );

      expect(html).toContain("TELA / PROJECAO");
      expect(html).toContain("shadow-[0_0_15px_rgba(233,69,96,0.6)]");
    });

    it("renderiza a legenda oficial com os 5 estados cromáticos", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
          showLegend: true,
        })
      );

      expect(html).toContain("Disponivel");
      expect(html).toContain("Selecionado");
      expect(html).toContain("Vendido / Ocupado");
      expect(html).toContain("Reservado (Online)");
      expect(html).toContain("Bloqueado");
    });

    it("agrupa assentos por rótulo de fileira em ordem alfabética", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
        })
      );

      expect(html).toContain('role="row"');
      expect(html).toContain(">A<");
      expect(html).toContain(">B<");
    });
  });

  describe("Mapeamento de Estados Cromáticos e Acessibilidade ARIA", () => {
    it("assento AVAILABLE possui cor verde (#22C55E), tabIndex=0 e não está desabilitado", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
          selectedSeatIds: [],
        })
      );

      expect(html).toContain('data-testid="seat-A1"');
      expect(html).toContain('data-status="AVAILABLE"');
      expect(html).toContain("bg-[#22C55E]");
      expect(html).toContain('aria-label="Fileira A, Assento 1 - Disponivel"');
      expect(html).toContain('tabindex="0"');
      expect(html).not.toContain('disabled="" data-testid="seat-A1"');
    });

    it("assento com id em selectedSeatIds adquire estado SELECTED (#E94560) com aria-selected=true", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
          selectedSeatIds: ["s-a1"],
        })
      );

      expect(html).toContain('data-testid="seat-A1"');
      expect(html).toContain('data-status="SELECTED"');
      expect(html).toContain("bg-[#E94560]");
      expect(html).toContain('aria-selected="true"');
    });

    it("assento SOLD possui cor vermelha muda (#EF4444), disabled=true e aria-disabled=true", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
        })
      );

      expect(html).toContain('data-testid="seat-A3"');
      expect(html).toContain('data-status="SOLD"');
      expect(html).toContain("bg-[#EF4444]/20");
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('tabindex="-1"');
    });

    it("assento RESERVED possui cor âmbar (#F59E0B) e disabled=true", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
        })
      );

      expect(html).toContain('data-testid="seat-B1"');
      expect(html).toContain('data-status="RESERVED"');
      expect(html).toContain("bg-[#F59E0B]");
      expect(html).toContain('disabled=""');
    });

    it("assento BLOCKED possui cor cinza (#9CA3AF) e disabled=true", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
        })
      );

      expect(html).toContain('data-testid="seat-B2"');
      expect(html).toContain('data-status="BLOCKED"');
      expect(html).toContain("bg-[#9CA3AF]/20");
      expect(html).toContain('disabled=""');
    });
  });

  describe("Cálculo de Preço e Resumo de Seleção", () => {
    it("exibe mensagem quando nenhum assento estiver selecionado", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
          selectedSeatIds: [],
          showSummary: true,
        })
      );

      expect(html).toContain("Assentos Selecionados (0)");
      expect(html).toContain("Nenhum assento selecionado");
      expect(html).toContain("R$ 0.00");
    });

    it("calcula soma dos valores e lista assentos quando houver múltiplos selecionados", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: mockSeats,
          selectedSeatIds: ["s-a1", "s-a2"],
          showSummary: true,
        })
      );

      expect(html).toContain("Assentos Selecionados (2)");
      expect(html).toContain("A1");
      expect(html).toContain("A2");
      expect(html).toContain("R$ 70.00");
    });
  });

  describe("Benchmark de Performance de Renderização (< 100ms)", () => {
    it("renderiza sala completa com 120 assentos (10x12) em menos de 100ms", () => {
      const largeRoomSeats: GridSeatItem[] = [];
      const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

      rowLabels.forEach((row) => {
        for (let col = 1; col <= 12; col++) {
          largeRoomSeats.push({
            id: "seat-" + row + "-" + col,
            rowLabel: row,
            columnNumber: col,
            seatCode: row + col,
            status: col % 5 === 0 ? "SOLD" : "AVAILABLE",
            price: 35,
          });
        }
      });

      expect(largeRoomSeats).toHaveLength(120);

      const startTime = performance.now();
      const html = renderToStaticMarkup(
        React.createElement(SeatingGrid, {
          seats: largeRoomSeats,
          selectedSeatIds: ["seat-A-1", "seat-B-2"],
          showLegend: true,
          showScreen: true,
          showSummary: true,
        })
      );
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      expect(html).toContain('data-testid="seat-J12"');
      expect(durationMs).toBeLessThan(100);
    });
  });
});
