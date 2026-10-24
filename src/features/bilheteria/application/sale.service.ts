import { CryptoService, sanitizeCPF } from "@/modules/crypto";
import type { ISaleRepository } from "../domain/sale-repository.interface";
import {
  defaultSaleRepository,
  SessionNotFoundError,
  SessionSeatNotFoundError,
  SeatNotAvailableError,
} from "../infrastructure/prisma-sale.repository";
import type {
  CreateSaleInput,
  SaleResponse,
} from "./sale.schema";

export {
  SessionNotFoundError,
  SessionSeatNotFoundError,
  SeatNotAvailableError,
};

export class SaleTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaleTransactionError";
  }
}

/**
 * Servico de Venda de Ingressos com Consistencia Transacional ACID (TASK-10 / AC-1 / AC-6 / ADR-004 / ADR-007)
 */
export class SaleServiceClass {
  constructor(private saleRepo: ISaleRepository = defaultSaleRepository) {}

  /**
   * Processa a venda de ingressos de forma atomica com trava pessimista em nivel de linha no PostgreSQL.
   * - Ordena os IDs de assento previamente para prevencao matematica de deadlock.
   * - Executa SELECT FOR UPDATE em session_seats dentro de transacao serializavel/isolada.
   * - Aborta com SeatNotAvailableError (HTTP 409) se qualquer assento nao estiver AVAILABLE.
   * - Registra ou atualiza Buyer com PII cifrado (AES-256-GCM) e hash deterministico (HMAC-SHA256).
   * - Emite Tickets vinculados ao atendente, sessao e comprador.
   */
  async processSale(
    input: CreateSaleInput,
    tenantId: string,
    soldByUserId: string
  ): Promise<SaleResponse> {
    // 1. Prevencao de Deadlock: Ordena estritamente os IDs dos assentos
    const sortedSeatIds = [...input.sessionSeatIds].sort();

    // 2. Preparacao e criptografia de PII do comprador
    const cleanCpf = sanitizeCPF(input.buyer.cpf);
    const cpfHash = CryptoService.hashCPF(cleanCpf);
    const cpfEncrypted = CryptoService.encryptCPF(cleanCpf);
    const lgpdConsentAt = new Date();

    // 3. Execucao transacional atomica via Repositorio
    const result = await this.saleRepo.executeSaleTransaction({
      sessionId: input.sessionId,
      tenantId,
      sortedSeatIds,
      soldByUserId,
      buyer: {
        name: input.buyer.name.trim(),
        email: input.buyer.email.trim().toLowerCase(),
        cleanCpf,
        cpfHash,
        cpfEncrypted,
        lgpdConsentAt,
      },
    });

    const totalAmount = result.tickets.reduce((acc, curr) => acc + curr.price, 0);

    return {
      success: true,
      message: "Venda realizada com sucesso.",
      buyer: result.buyer,
      tickets: result.tickets,
      totalAmount,
    };
  }
}

export const SaleService = new SaleServiceClass();
export const processSale = SaleService.processSale.bind(SaleService);
