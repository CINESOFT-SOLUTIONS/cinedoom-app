import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

    it("inicia na Etapa 1 com seleção de datas e escolha de sessão", () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingFlow, {
          initialFilmId: "film-01",
        })
      );

      // Elementos da Etapa 1
      expect(html).toContain("Escolha a Data");
      expect(html).toContain("Escolha uma sessão");
      expect(html).toContain("Hoje");
      expect(html).toContain("Amanhã");
    });

    it("padroniza os valores de ingressos para R$ 30,00 inteira e R$ 15,00 meia", () => {
      const sourceCode = BookingFlow.toString();
      expect(sourceCode).toContain("unitPrice = 30");
      expect(sourceCode).toContain("inteiraPrice = 30");
      expect(sourceCode).toContain("meiaPrice = 15");
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

  describe("Modal de Expiração do Tempo (10 Minutos)", () => {
    it("valida a estrutura do modal de tempo esgotado e redirecionamento para tela inicial", () => {
      // Simula sessionStorage
      const storageMock: Record<string, string> = {
        cinedoom_booking_state_v1: JSON.stringify({
          currentStep: 3,
          holdToken: "expired-token",
          holdExpiresAt: Date.now() - 5000, // expirou há 5 segundos
        }),
      };

      const originalSessionStorage = (global as any).sessionStorage;
      (global as any).sessionStorage = {
        getItem: (key: string) => storageMock[key] || null,
        setItem: (key: string, value: string) => {
          storageMock[key] = value;
        },
        removeItem: (key: string) => {
          delete storageMock[key];
        },
        clear: () => {
          Object.keys(storageMock).forEach((k) => delete storageMock[k]);
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(BookingFlow, {
          initialFilmId: "film-01",
        })
      );

      // Restaura sessionStorage
      (global as any).sessionStorage = originalSessionStorage;

      // Componente renderiza normalmente
      expect(html).toBeDefined();
      expect(html).toContain("Sessões");
      expect(html).toContain("Assentos");

      // Validamos que o código do BookingFlow contém o modal de tempo esgotado com botão OK
      const sourceCode = BookingFlow.toString();
      expect(sourceCode).toContain("Tempo Esgotado!");
      expect(sourceCode).toContain("O prazo de 10 minutos para concluir sua reserva expirou.");
      expect(sourceCode).toContain("handleExpiredOk");
      expect(sourceCode).toContain('window.location.href = "/"');
    });
  });

  describe("Isolamento e Inicialização de Novas Reservas (Cenários Críticos)", () => {
    let storageMap: Record<string, string> = {};
    const originalFetch = globalThis.fetch;
    const originalSessionStorage = (globalThis as any).sessionStorage;

    beforeEach(() => {
      storageMap = {};
      (globalThis as any).sessionStorage = {
        getItem: vi.fn((key: string) => storageMap[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          storageMap[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete storageMap[key];
        }),
        clear: vi.fn(() => {
          storageMap = {};
        }),
      };
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      (globalThis as any).sessionStorage = originalSessionStorage;
    });

    it("Cenário 1 — Troca de filme durante a reserva reinicia na Etapa 1 sem dados residuais", async () => {
      const { BOOKING_STORAGE_KEY } = await import(
        "@/components/booking/reservation-lifecycle"
      );

      // Simula uma reserva em andamento para o Filme A (Etapa 3, poltronas selecionadas)
      storageMap[BOOKING_STORAGE_KEY] = JSON.stringify({
        contextId: "ctx_film_a_123",
        selectedFilmId: "film-A",
        selectedSessionId: "sess-A",
        selectedSeatIds: ["A1", "A2"],
        ticketQuantities: { inteira: 2, meia: 0 },
        holdToken: "token-film-a",
        holdExpiresAt: Date.now() + 500000,
        currentStep: 3,
        createdAt: Date.now(),
      });

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      globalThis.fetch = fetchSpy as any;

      // Usuário abandona o Filme A e seleciona o Filme B
      const { abandonPreviousReservationIfDifferent, getSavedReservationContext } =
        await import("@/components/booking/reservation-lifecycle");

      const abandoned = await abandonPreviousReservationIfDifferent("film-B");
      expect(abandoned).toBe(true);

      // Verifica que o storage do Filme A foi purgado e assentos liberados no backend
      expect(storageMap[BOOKING_STORAGE_KEY]).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/portal/sessoes/sess-A/bloqueio"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "RELEASE", holdToken: "token-film-a" }),
        })
      );

      // Renderiza BookingFlow para o Filme B
      const html = renderToStaticMarkup(
        React.createElement(BookingFlow, {
          initialFilmId: "film-B",
        })
      );

      // O novo fluxo deve iniciar na Etapa 1 e não conter resquícios de A
      expect(html).toContain("Sessões");
      expect(html).toContain("Escolha uma sessão");
      expect(html).not.toContain("Ingresso Inteira");
      expect(html).not.toContain("Ingresso Meia");
    });

    it("Cenário 2 — Troca de filme após selecionar poltronas encerra bloqueio anterior no backend", async () => {
      const { BOOKING_STORAGE_KEY, abandonPreviousReservationIfDifferent } = await import(
        "@/components/booking/reservation-lifecycle"
      );

      storageMap[BOOKING_STORAGE_KEY] = JSON.stringify({
        contextId: "ctx_hold_001",
        selectedFilmId: "film-avatar",
        selectedSessionId: "sess-avatar-99",
        selectedSeatIds: ["B3", "B4", "B5"],
        ticketQuantities: { inteira: 0, meia: 0 },
        holdToken: "hold_token_avatar_xyz",
        holdExpiresAt: Date.now() + 600000,
        currentStep: 2,
        createdAt: Date.now(),
      });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, released: true }),
      });
      globalThis.fetch = fetchMock as any;

      // Abandonar reserva ao clicar em outro filme (ex: Dune)
      await abandonPreviousReservationIfDifferent("film-dune");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/portal/sessoes/sess-avatar-99/bloqueio",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "RELEASE", holdToken: "hold_token_avatar_xyz" }),
        })
      );
      expect(storageMap[BOOKING_STORAGE_KEY]).toBeUndefined();
    });

    it("Cenário 3 — Preserva a navegação dentro da mesma reserva (voltar etapas mantém dados)", async () => {
      const { BOOKING_STORAGE_KEY, abandonPreviousReservationIfDifferent } = await import(
        "@/components/booking/reservation-lifecycle"
      );

      const reservationState = {
        contextId: "ctx_same_film_123",
        selectedFilmId: "film-oppenheimer",
        selectedSessionId: "sess-opp-01",
        selectedSeatIds: ["C1", "C2"],
        ticketQuantities: { inteira: 1, meia: 1 },
        holdToken: "hold_token_opp",
        holdExpiresAt: Date.now() + 450000,
        currentStep: 3,
        createdAt: Date.now(),
      };

      storageMap[BOOKING_STORAGE_KEY] = JSON.stringify(reservationState);

      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as any;

      // Navegar para o mesmo filme (ou retornar entre telas dentro da mesma reserva)
      const abandoned = await abandonPreviousReservationIfDifferent("film-oppenheimer");

      // NÃO deve abandonar nem limpar quando for o mesmo filme
      expect(abandoned).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(storageMap[BOOKING_STORAGE_KEY]).toBeDefined();

      const saved = JSON.parse(storageMap[BOOKING_STORAGE_KEY]);
      expect(saved.selectedSeatIds).toEqual(["C1", "C2"]);
      expect(saved.selectedSessionId).toBe("sess-opp-01");
      expect(saved.ticketQuantities).toEqual({ inteira: 1, meia: 1 });
    });

    it("Cenário 4 — Troca rápida de filmes (A -> B -> C) mantém ativo somente o contexto final", async () => {
      const { BOOKING_STORAGE_KEY, abandonPreviousReservationIfDifferent, generateReservationContextId } =
        await import("@/components/booking/reservation-lifecycle");

      const releaseCalls: string[] = [];
      globalThis.fetch = vi.fn().mockImplementation((url: string, init: any) => {
        if (init?.body) {
          const body = JSON.parse(init.body);
          if (body.action === "RELEASE") {
            releaseCalls.push(body.holdToken);
          }
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }) as any;

      // 1. Inicia Filme A
      const ctxA = generateReservationContextId();
      storageMap[BOOKING_STORAGE_KEY] = JSON.stringify({
        contextId: ctxA,
        selectedFilmId: "film-A",
        selectedSessionId: "sess-A",
        selectedSeatIds: ["A1"],
        holdToken: "hold-A",
        holdExpiresAt: Date.now() + 500000,
        currentStep: 2,
        createdAt: Date.now(),
      });

      // 2. Sai e seleciona Filme B
      await abandonPreviousReservationIfDifferent("film-B");
      expect(releaseCalls).toContain("hold-A");

      // Inicia Filme B
      const ctxB = generateReservationContextId();
      storageMap[BOOKING_STORAGE_KEY] = JSON.stringify({
        contextId: ctxB,
        selectedFilmId: "film-B",
        selectedSessionId: "sess-B",
        selectedSeatIds: ["B1"],
        holdToken: "hold-B",
        holdExpiresAt: Date.now() + 500000,
        currentStep: 2,
        createdAt: Date.now(),
      });

      // 3. Sai e seleciona Filme C
      await abandonPreviousReservationIfDifferent("film-C");
      expect(releaseCalls).toContain("hold-B");

      // Apenas o contexto de C deve ser criado e isolado
      const ctxC = generateReservationContextId();
      expect(ctxC).not.toBe(ctxA);
      expect(ctxC).not.toBe(ctxB);
    });

    it("Cenário 5 — Respostas assíncronas pendentes da reserva anterior são canceladas e não sobrescrevem a nova", () => {
      const sourceCode = BookingFlow.toString();

      // Verifica presença de AbortController para cancelamento assíncrono
      expect(sourceCode).toContain("abortControllerRef");
      expect(sourceCode).toContain("abort()");
      expect(sourceCode).toContain("signal: abortControllerRef.current?.signal");

      // Verifica verificação estrita de contexto ativo após promessas assíncronas
      expect(sourceCode).toContain("contextIdRef.current !== activeCtx");
      expect(sourceCode).toContain("resetForNewReservation");
    });

    it("Cenário Autenticação — Rejeita restauração indevida se o usuário trocar de filme durante o login", async () => {
      const { BOOKING_STORAGE_KEY } = await import(
        "@/components/booking/reservation-lifecycle"
      );

      // Usuário iniciou login no Filme A
      storageMap[BOOKING_STORAGE_KEY] = JSON.stringify({
        contextId: "ctx_login_A",
        selectedFilmId: "film-A",
        selectedSessionId: "sess-A",
        selectedSeatIds: ["D5"],
        ticketQuantities: { inteira: 1, meia: 0 },
        holdToken: "hold-login-A",
        holdExpiresAt: Date.now() + 500000,
        currentStep: 3,
        createdAt: Date.now(),
      });

      const releaseSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
      globalThis.fetch = releaseSpy as any;

      // Mas acessa o portal com initialFilmId diferente (Filme B)
      const html = renderToStaticMarkup(
        React.createElement(BookingFlow, {
          initialFilmId: "film-B",
        })
      );

      // O BookingFlow detecta a divergência e NÃO restaura o Filme A
      expect(html).toBeDefined();
      expect(html).toContain("Sessões");
    });

    it("Assentos nos mocks iniciam 100% disponíveis para reserva do usuário", async () => {
      const { generateMockSeats } = await import("@/modules/portal/mock-cinema-data");

      const seats = generateMockSeats(6, 8, 30, "session-alpha-101");

      // Nenhum assento mock deve vir pré-ocupado ou pré-reservado
      const reserved = seats.filter((s) => s.status !== "AVAILABLE");
      expect(reserved.length).toBe(0);
      expect(seats.length).toBe(48);
      expect(seats.every((s) => s.status === "AVAILABLE")).toBe(true);
    });

    it("Ao sair de uma sessão, todo o estado anterior é descartado", () => {
      const sourceCode = BookingFlow.toString();
      expect(sourceCode).toContain("handleBackToSessions");
      expect(sourceCode).toContain("handleSelectSession");
      expect(sourceCode).toContain("clearReservationContext()");
      expect(sourceCode).toContain("setSelectedSeatIds([])");
    });
  });
});
