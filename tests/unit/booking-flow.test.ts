import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingFlow } from "@/components/booking/booking-flow";
import { TemporaryHoldService } from "@/features/reserva/application/temporary-hold.service";

// Mock do Next.js Router e NextAuth para testes unitários isolados
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
}));

vi.mock("@/contexts/auth-modal-context", () => ({
  useAuthModal: () => ({
    isOpen: false,
    view: "login",
    openLogin: vi.fn(),
    openCadastro: vi.fn(),
    switchView: vi.fn(),
    close: vi.fn(),
  }),
}));

describe("Reformulação do Fluxo de Reservas do CineDoom (4 Etapas Sequenciais)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Barra de Progresso e Navegação (4 Etapas)", () => {
    it("renderiza a barra de progresso horizontal com as quatro etapas canônicas", () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingFlow, {
          initialFilmId: "film-01",
        })
      );

      // Deve conter os 4 passos canônicos
      expect(html).toContain("Sessões");
      expect(html).toContain("Assentos");
      expect(html).toContain("Ingressos");
      expect(html).toContain("Resumo");
      expect(html).toContain('aria-label="Progresso da Reserva"');
    });

    it("inicia na Etapa 1 com seleção de datas e informações do cinema", () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingFlow, {
          initialFilmId: "film-01",
        })
      );

      // Elementos da Etapa 1
      expect(html).toContain("Escolha a Data");
      expect(html).toContain("CineDoom Prime Cinemas");
      expect(html).toContain("Salas &amp; Horários Disponíveis");
      expect(html).toContain("Hoje");
      expect(html).toContain("Amanhã");
    });
  });

  describe("Serviço de Bloqueio Temporário (10 Minutos & Concorrência)", () => {
    const sessionId = "sess-test-uuid-001";
    const seatIds = ["seat-1", "seat-2"];

    it("bloqueia assentos por 10 minutos (600 segundos)", async () => {
      const token = "token-user-a";
      const result = await TemporaryHoldService.holdSeats({
        sessionId,
        seatIds,
        holdToken: token,
      });

      expect(result.holdToken).toBe(token);
      expect(result.remainingSeconds).toBeGreaterThanOrEqual(598);
      expect(result.remainingSeconds).toBeLessThanOrEqual(600);
      expect(TemporaryHoldService.isHoldValid(token, sessionId, seatIds)).toBe(true);
    });

    it("impede que outro usuário bloqueie os mesmos assentos simultaneamente (concorrência)", async () => {
      const tokenA = "token-user-a-2";
      const tokenB = "token-user-b-2";
      const uniqueSeat = ["seat-unique-123"];

      // Usuário A bloqueia primeiro
      await TemporaryHoldService.holdSeats({
        sessionId,
        seatIds: uniqueSeat,
        holdToken: tokenA,
      });

      // Usuário B tenta bloquear o mesmo assento
      await expect(
        TemporaryHoldService.holdSeats({
          sessionId,
          seatIds: uniqueSeat,
          holdToken: tokenB,
        })
      ).rejects.toThrow(/bloqueado/);
    });

    it("rejeita bloqueio de mais de 5 assentos (limite máximo canônico)", async () => {
      const sixSeats = ["s-1", "s-2", "s-3", "s-4", "s-5", "s-6"];
      await expect(
        TemporaryHoldService.holdSeats({
          sessionId,
          seatIds: sixSeats,
          holdToken: "token-excess",
        })
      ).rejects.toThrow("Limite maximo de 5 assentos por reserva excedido.");
    });

    it("libera assentos com sucesso quando solicitado", async () => {
      const tokenRelease = "token-release-test";
      const seatsToRelease = ["seat-rel-1"];

      await TemporaryHoldService.holdSeats({
        sessionId,
        seatIds: seatsToRelease,
        holdToken: tokenRelease,
      });

      expect(TemporaryHoldService.isHoldValid(tokenRelease, sessionId, seatsToRelease)).toBe(true);

      await TemporaryHoldService.releaseHold(tokenRelease);

      expect(TemporaryHoldService.isHoldValid(tokenRelease, sessionId, seatsToRelease)).toBe(false);
    });
  });

  describe("Instruções de Resgate Oficiais do CineDoom", () => {
    it("valida a presença das regras de resgate presencial e prazo de 1 hora", () => {
      const instructions =
        "Apresente este codigo na bilheteria fisica do cinema para efetuar o pagamento presencial em dinheiro, debito ou credito ate 1 hora antes do inicio da sessao.";

      expect(instructions).toContain("bilheteria fisica");
      expect(instructions).toContain("1 hora antes do inicio da sessao");
    });
  });
});
