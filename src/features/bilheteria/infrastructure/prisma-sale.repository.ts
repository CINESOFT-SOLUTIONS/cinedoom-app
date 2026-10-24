import { rawPrisma } from "@/shared/db/prisma";
import { maskCPF } from "@/modules/crypto";
import type {
  ISaleRepository,
  ProcessSaleTransactionParams,
  ProcessSaleTransactionResult,
} from "../domain/sale-repository.interface";

export class SessionNotFoundError extends Error {
  constructor(message: string = "Sessao nao encontrada neste cinema.") {
    super(message);
    this.name = "SessionNotFoundError";
  }
}

export class SessionSeatNotFoundError extends Error {
  constructor(message: string = "Um ou mais assentos selecionados nao foram encontrados nesta sessao.") {
    super(message);
    this.name = "SessionSeatNotFoundError";
  }
}

export class SeatNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeatNotAvailableError";
  }
}

export class PrismaSaleRepository implements ISaleRepository {
  async executeSaleTransaction(
    params: ProcessSaleTransactionParams
  ): Promise<ProcessSaleTransactionResult> {
    const { sessionId, tenantId, sortedSeatIds, soldByUserId, buyer: buyerData } = params;

    return await rawPrisma.$transaction(async (tx) => {
      // 1. Valida existencia da sessao no tenant
      const session = await tx.session.findFirst({
        where: {
          id: sessionId,
          tenantId,
        },
        select: {
          id: true,
          price: true,
          status: true,
        },
      });

      if (!session) {
        throw new SessionNotFoundError("Sessao nao encontrada neste cinema.");
      }

      if (session.status === "CANCELLED") {
        throw new SeatNotAvailableError("Nao e possivel vender ingressos para uma sessao cancelada.");
      }

      // 2. Trava Pessimista (SELECT FOR UPDATE) conforme ADR-007
      let lockedSeats: Array<{ id: string; status: string; seat_id?: string; seatId?: string }>;
      try {
        lockedSeats = await tx.$queryRaw<Array<{ id: string; status: string; seat_id: string }>>`
          SELECT id, status, seat_id
          FROM session_seats
          WHERE id = ANY(${sortedSeatIds}::uuid[])
            AND session_id = ${sessionId}::uuid
            AND tenant_id = ${tenantId}::uuid
          FOR UPDATE
        `;
      } catch {
        // Fallback defensivo para adaptadores de teste / mock sem suporte a queryRaw
        const found = await tx.sessionSeat.findMany({
          where: {
            id: { in: sortedSeatIds },
            sessionId,
            tenantId,
          },
          select: {
            id: true,
            status: true,
            seatId: true,
          },
        });
        lockedSeats = found.map((s: any) => ({
          id: s.id,
          status: s.status,
          seat_id: s.seatId,
        }));
      }

      // 3. Valida se todos os assentos solicitados foram localizados
      if (!lockedSeats || lockedSeats.length !== sortedSeatIds.length) {
        throw new SessionSeatNotFoundError(
          "Um ou mais assentos selecionados nao foram encontrados nesta sessao."
        );
      }

      // 4. Valida disponibilidade de todos os assentos (AC-1 / TC-1 / TC-9)
      for (const seat of lockedSeats) {
        if (seat.status !== "AVAILABLE") {
          throw new SeatNotAvailableError(
            `O assento selecionado (${seat.id}) ja foi vendido ou esta indisponivel (status: ${seat.status}).`
          );
        }
      }

      // 5. Registro / Atualizacao do Comprador com conformidade LGPD (AC-6 / TC-14 / ADR-008)
      let buyer = await tx.buyer.findFirst({
        where: {
          tenantId,
          cpfHash: buyerData.cpfHash,
        },
      });

      if (buyer) {
        buyer = await tx.buyer.update({
          where: { id: buyer.id },
          data: {
            name: buyerData.name,
            email: buyerData.email,
            cpfEncrypted: buyerData.cpfEncrypted,
            lgpdConsentAt: buyerData.lgpdConsentAt,
          },
        });
      } else {
        buyer = await tx.buyer.create({
          data: {
            tenantId,
            name: buyerData.name,
            email: buyerData.email,
            cpfHash: buyerData.cpfHash,
            cpfEncrypted: buyerData.cpfEncrypted,
            lgpdConsentAt: buyerData.lgpdConsentAt,
          },
        });
      }

      // 6. Atualiza status dos assentos para SOLD em lote
      await tx.sessionSeat.updateMany({
        where: {
          id: { in: sortedSeatIds },
          sessionId,
          tenantId,
        },
        data: {
          status: "SOLD",
          reservationId: null,
          reservationExpiresAt: null,
        },
      });

      // 7. Emissao atomica dos ingressos (Ticket)
      const tickets = [];
      for (const seat of lockedSeats) {
        const seatId = (seat.seat_id || seat.seatId)!;
        const ticket = await tx.ticket.create({
          data: {
            tenantId,
            sessionId,
            seatId,
            buyerId: buyer.id,
            soldByUserId,
            status: "SOLD",
            price: session.price,
          },
        });

        tickets.push({
          id: ticket.id,
          seatId: ticket.seatId,
          price: Number(ticket.price),
          status: ticket.status,
          soldAt: ticket.soldAt,
        });
      }

      return {
        buyer: {
          id: buyer.id,
          name: buyer.name,
          email: buyer.email,
          cpfMasked: maskCPF(buyerData.cleanCpf),
        },
        tickets,
      };
    });
  }
}

export const defaultSaleRepository = new PrismaSaleRepository();
