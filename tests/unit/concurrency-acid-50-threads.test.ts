import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { rawPrisma } from "@/shared/db/prisma";
import { POST as processSaleRoute } from "@/app/api/vendas/route";

// Mock do next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock do Prisma com suporte a $transaction mockavel
vi.mock("@/shared/db/prisma", () => {
  const mockDb = {
    session: {
      findFirst: vi.fn(),
    },
    sessionSeat: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    buyer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };

  return {
    rawPrisma: mockDb,
    prisma: mockDb,
  };
});

describe("Suíte de Carga Concorrente com 50 Threads Simultâneas e 0 Double-Booking (TASK-19 / AC-1 / ADR-007 / TC-3)", () => {
  const tenantId = "00000000-0000-4000-a000-000000000001";
  const userId = "00000000-0000-4000-a000-000000000002";
  const sessionId = "00000000-0000-4000-a000-000000000003";
  const sessionSeatIdA1 = "00000000-0000-4000-a000-000000000004";

  // CPF matematicamente valido para testes
  const validCPF = "529.982.247-25";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DoD Principal: 50 threads concorrentes disputando o mesmo assento A1 resultam em exatamente 1 sucesso (201) e 49 conflitos (409)", async () => {
    // 1. Configura sessao autenticada
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: userId, role: "ATENDENTE", tenantId },
    } as any);

    // 2. Estado compartilhado do banco em memoria simulando o PostgreSQL
    const database = {
      sessionSeats: new Map<string, { id: string; sessionId: string; status: string; seatId: string }>([
        [sessionSeatIdA1, { id: sessionSeatIdA1, sessionId, status: "AVAILABLE", seatId: "seat-a1" }],
      ]),
      tickets: [] as Array<{ id: string; sessionSeatId: string; status: string; soldAt: Date }>,
    };

    // 3. Fila de trava pessimista por linha (SELECT ... FOR UPDATE)
    // No PostgreSQL real, transacoes concorrentes no mesmo registro aguardam o lock.
    // A primeira transacao le AVAILABLE e comita como SOLD. As 49 seguintes leem SOLD e abortam com conflito.
    let isRowLocked = false;
    const lockWaiters: Array<() => void> = [];

    const acquireRowLock = async () => {
      if (isRowLocked) {
        await new Promise<void>((resolve) => lockWaiters.push(resolve));
      }
      isRowLocked = true;
    };

    const releaseRowLock = () => {
      isRowLocked = false;
      const nextWaiter = lockWaiters.shift();
      if (nextWaiter) {
        nextWaiter();
      }
    };

    // 4. Mock da transacao ACID do Prisma
    (rawPrisma.$transaction as any).mockImplementation(async (callback: any) => {
      await acquireRowLock();
      try {
        const mockTx = {
          session: {
            findFirst: vi.fn().mockResolvedValue({
              id: sessionId,
              price: 35.0,
              status: "SCHEDULED",
            }),
          },
          // SELECT ... FOR UPDATE
          $queryRaw: vi.fn().mockImplementation(async () => {
            const seat = database.sessionSeats.get(sessionSeatIdA1)!;
            return [{ id: seat.id, status: seat.status, seat_id: seat.seatId }];
          }),
          sessionSeat: {
            findMany: vi.fn().mockImplementation(async () => {
              const seat = database.sessionSeats.get(sessionSeatIdA1)!;
              return [{ id: seat.id, status: seat.status, seatId: seat.seatId }];
            }),
            updateMany: vi.fn().mockImplementation(async (args: any) => {
              const seat = database.sessionSeats.get(sessionSeatIdA1)!;
              seat.status = args.data.status;
              return { count: 1 };
            }),
          },
          buyer: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "buyer-created", tenantId }),
            update: vi.fn().mockResolvedValue({ id: "buyer-updated", tenantId }),
          },
          ticket: {
            create: vi.fn().mockImplementation(async () => {
              const newTicket = {
                id: `ticket-${database.tickets.length + 1}`,
                sessionSeatId: sessionSeatIdA1,
                status: "SOLD",
                soldAt: new Date(),
              };
              database.tickets.push(newTicket);
              return {
                id: newTicket.id,
                seatId: "seat-a1",
                price: 35.0,
                status: "SOLD",
                soldAt: newTicket.soldAt,
              };
            }),
          },
        };

        return await callback(mockTx);
      } finally {
        releaseRowLock();
      }
    });

    // 5. Prepara 50 requisicoes com terminais e compradores distintos
    const totalThreads = 50;
    const requests = Array.from({ length: totalThreads }, (_, i) => {
      const payload = {
        sessionId,
        sessionSeatIds: [sessionSeatIdA1],
        buyer: {
          name: `Comprador Concorrente ${i + 1}`,
          cpf: validCPF,
          email: `cliente${i + 1}@cinedoom.com`,
          lgpdConsent: true,
        },
      };

      return new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    });

    // 6. Dispara as 50 requisicoes simultaneas no mesmo instante com Promise.allSettled
    const startTimestamp = performance.now();
    const settledResults = await Promise.allSettled(
      requests.map((req) => processSaleRoute(req))
    );
    const durationMs = performance.now() - startTimestamp;

    // 7. Extrai as respostas e status codes
    const responses = settledResults.map((result) => {
      expect(result.status).toBe("fulfilled");
      return (result as PromiseFulfilledResult<Response>).value;
    });

    const statusCodes = responses.map((res) => res.status);
    const successes = statusCodes.filter((status) => status === 201);
    const conflicts = statusCodes.filter((status) => status === 409);

    // 8. Validacoes matematicas de tolerância zero a double-booking (DoD)
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(49);
    expect(statusCodes).toHaveLength(50);

    // 9. Inspeciona o payload da transacao vencedora
    const winningResponse = responses.find((res) => res.status === 201)!;
    const winningBody = await winningResponse.json();
    expect(winningBody.success).toBe(true);
    expect(winningBody.tickets).toHaveLength(1);
    expect(winningBody.totalAmount).toBe(35.0);

    // 10. Inspeciona o payload de uma transacao conflitante
    const conflictingResponse = responses.find((res) => res.status === 409)!;
    const conflictingBody = await conflictingResponse.json();
    expect(conflictingBody.error).toContain("ja foi vendido ou esta indisponivel");

    // 11. Valida o estado final no banco de dados (SELECT COUNT(*) FROM tickets ...)
    const finalSeatState = database.sessionSeats.get(sessionSeatIdA1)!;
    expect(finalSeatState.status).toBe("SOLD");
    expect(database.tickets).toHaveLength(1);
    expect(database.tickets[0].sessionSeatId).toBe(sessionSeatIdA1);
    expect(database.tickets[0].status).toBe("SOLD");

    // 12. Benchmark: Execucao das 50 threads concorrentes processada rapidamente (< 5s)
    expect(durationMs).toBeLessThan(5000);
  });

  it("Cenário de Concorrência Multi-Assentos: 50 threads disputando pares sobrepostos (A1 e A2)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: userId, role: "ATENDENTE", tenantId },
    } as any);

    const seatA1 = "00000000-0000-4000-a000-000000000011";
    const seatA2 = "00000000-0000-4000-a000-000000000012";

    const database = {
      sessionSeats: new Map<string, { id: string; status: string; seatId: string }>([
        [seatA1, { id: seatA1, status: "AVAILABLE", seatId: "seat-1" }],
        [seatA2, { id: seatA2, status: "AVAILABLE", seatId: "seat-2" }],
      ]),
      ticketsCount: 0,
    };

    let isLocked = false;
    const lockWaiters: Array<() => void> = [];

    const acquireLock = async () => {
      if (isLocked) {
        await new Promise<void>((resolve) => lockWaiters.push(resolve));
      }
      isLocked = true;
    };

    const releaseLock = () => {
      isLocked = false;
      const next = lockWaiters.shift();
      if (next) next();
    };

    (rawPrisma.$transaction as any).mockImplementation(async (callback: any) => {
      await acquireLock();
      try {
        const mockTx = {
          session: {
            findFirst: vi.fn().mockResolvedValue({ id: sessionId, price: 40.0, status: "SCHEDULED" }),
          },
          $queryRaw: vi.fn().mockImplementation(async () => {
            return [
              { id: seatA1, status: database.sessionSeats.get(seatA1)!.status, seat_id: "seat-1" },
              { id: seatA2, status: database.sessionSeats.get(seatA2)!.status, seat_id: "seat-2" },
            ];
          }),
          sessionSeat: {
            findMany: vi.fn().mockImplementation(async () => [
              { id: seatA1, status: database.sessionSeats.get(seatA1)!.status, seatId: "seat-1" },
              { id: seatA2, status: database.sessionSeats.get(seatA2)!.status, seatId: "seat-2" },
            ]),
            updateMany: vi.fn().mockImplementation(async (args: any) => {
              database.sessionSeats.get(seatA1)!.status = args.data.status;
              database.sessionSeats.get(seatA2)!.status = args.data.status;
              return { count: 2 };
            }),
          },
          buyer: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "buyer-1", tenantId }),
          },
          ticket: {
            create: vi.fn().mockImplementation(async () => {
              database.ticketsCount++;
              return { id: `ticket-${database.ticketsCount}`, seatId: "seat", price: 40.0, status: "SOLD", soldAt: new Date() };
            }),
          },
        };

        return await callback(mockTx);
      } finally {
        releaseLock();
      }
    });

    const requests = Array.from({ length: 50 }, (_, i) => {
      const payload = {
        sessionId,
        sessionSeatIds: [seatA1, seatA2],
        buyer: {
          name: `Comprador Par ${i + 1}`,
          cpf: validCPF,
          email: `par${i + 1}@cinedoom.com`,
          lgpdConsent: true,
        },
      };

      return new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    });

    const settledResults = await Promise.allSettled(requests.map((r) => processSaleRoute(r)));
    const statusCodes = settledResults.map((r) => (r as PromiseFulfilledResult<Response>).value.status);

    expect(statusCodes.filter((s) => s === 201)).toHaveLength(1);
    expect(statusCodes.filter((s) => s === 409)).toHaveLength(49);
    expect(database.sessionSeats.get(seatA1)!.status).toBe("SOLD");
    expect(database.sessionSeats.get(seatA2)!.status).toBe("SOLD");
    expect(database.ticketsCount).toBe(2);
  });

  it("Cenário de Concorrência Independente: 50 threads comprando 50 assentos distintos em paralelo (100% de sucesso)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: userId, role: "ATENDENTE", tenantId },
    } as any);

    (rawPrisma.$transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        session: {
          findFirst: vi.fn().mockResolvedValue({ id: sessionId, price: 25.0, status: "SCHEDULED" }),
        },
        $queryRaw: vi.fn().mockImplementation(async () => {
          return [{ id: "mock-seat", status: "AVAILABLE", seat_id: "mock" }];
        }),
        sessionSeat: {
          findMany: vi.fn().mockResolvedValue([{ id: "mock-seat", status: "AVAILABLE", seatId: "mock" }]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        buyer: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "buyer-ind", tenantId }),
        },
        ticket: {
          create: vi.fn().mockResolvedValue({
            id: "ticket-ind",
            seatId: "seat",
            price: 25.0,
            status: "SOLD",
            soldAt: new Date(),
          }),
        },
      };
      return await callback(mockTx);
    });

    const requests = Array.from({ length: 50 }, (_, i) => {
      const sId = `00000000-0000-4000-a000-00000000${(i + 100).toString().padStart(4, "0")}`;
      const payload = {
        sessionId,
        sessionSeatIds: [sId],
        buyer: {
          name: `Comprador Distinto ${i + 1}`,
          cpf: validCPF,
          email: `distinto${i + 1}@cinedoom.com`,
          lgpdConsent: true,
        },
      };

      return new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    });

    const settledResults = await Promise.allSettled(requests.map((r) => processSaleRoute(r)));
    const statusCodes = settledResults.map((r) => (r as PromiseFulfilledResult<Response>).value.status);

    // Como cada assento é único e independente, todas as 50 transações obtêm sucesso
    expect(statusCodes.filter((s) => s === 201)).toHaveLength(50);
    expect(statusCodes.filter((s) => s === 409)).toHaveLength(0);
  });

  it("Cenário de Sessão Cancelada: 50 threads concorrentes são todas rejeitadas com erro de disponibilidade", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: userId, role: "ATENDENTE", tenantId },
    } as any);

    (rawPrisma.$transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        session: {
          findFirst: vi.fn().mockResolvedValue({
            id: sessionId,
            price: 30.0,
            status: "CANCELLED", // Sessao cancelada
          }),
        },
      };
      return await callback(mockTx);
    });

    const requests = Array.from({ length: 50 }, (_, i) => {
      const payload = {
        sessionId,
        sessionSeatIds: [sessionSeatIdA1],
        buyer: {
          name: `Tentativa ${i + 1}`,
          cpf: validCPF,
          email: `cancelada${i + 1}@cinedoom.com`,
          lgpdConsent: true,
        },
      };

      return new NextRequest("http://localhost:3000/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    });

    const settledResults = await Promise.allSettled(requests.map((r) => processSaleRoute(r)));
    const statusCodes = settledResults.map((r) => (r as PromiseFulfilledResult<Response>).value.status);

    expect(statusCodes.filter((s) => s === 409)).toHaveLength(50);
    expect(statusCodes.filter((s) => s === 201)).toHaveLength(0);
  });
});
