import { CryptoService, sanitizeCPF, maskCPF } from "@/modules/crypto";
import type {
  ITitularRepository,
  AnonymizationResult,
  TitularDetails,
} from "../domain/titular-repository.interface";
import { defaultTitularRepository } from "../infrastructure/prisma-titular.repository";
import type { AnonymizeTitularInput } from "./anonymization.schema";

export { AnonymizationResult, TitularDetails };

export class TitularNotFoundError extends Error {
  constructor(message = "Titular de dados nao localizado no cinema informado.") {
    super(message);
    this.name = "TitularNotFoundError";
  }
}

export class TitularAlreadyAnonymizedError extends Error {
  constructor(message = "Os dados pessoais deste titular ja foram anonimizados anteriormente (Art. 18 LGPD).") {
    super(message);
    this.name = "TitularAlreadyAnonymizedError";
  }
}

export class AnonymizationServiceClass {
  constructor(private titularRepo: ITitularRepository = defaultTitularRepository) {}

  /**
   * Executa a anonimizacao in-place de dados pessoais do titular conforme Art. 18 da LGPD
   * sem romper integridade contabil exigida pelo CDC Art. 27 (ADR-009).
   */
  async anonymizeTitular(
    input: AnonymizeTitularInput,
    tenantId: string
  ): Promise<AnonymizationResult> {
    if (!tenantId) {
      throw new Error("Contexto de tenantId e obrigatorio para anonimizacao de titular.");
    }

    let buyer = null;

    if (input.buyerId) {
      buyer = await this.titularRepo.findById(input.buyerId, tenantId);
    } else if (input.cpf) {
      const sanitized = sanitizeCPF(input.cpf);
      const cpfHash = CryptoService.hashCPF(sanitized);
      buyer = await this.titularRepo.findByCpfHash(cpfHash, tenantId);
    }

    if (!buyer) {
      throw new TitularNotFoundError();
    }

    if (buyer.anonymizedAt !== null) {
      throw new TitularAlreadyAnonymizedError(
        `Os dados pessoais deste titular ja foram anonimizados em ${buyer.anonymizedAt.toISOString()} (Art. 18 LGPD).`
      );
    }

    // Conta quantos ingressos estao atrelados ao comprador para certificar preservacao da integridade
    const ticketsPreserved = await this.titularRepo.countTickets(buyer.id);

    const now = new Date();

    // Gera blind index ficticio irreversivel (hash do ID anonimizado + timestamp)
    const dummyCpf = `00000000000`;
    const dummyHash = CryptoService.hashCPF(`ANONYMIZED:${buyer.id}:${now.getTime()}`);
    const dummyEncrypted = CryptoService.encryptCPF(dummyCpf);

    // Sobrescrita in-place: name, email, cpfHash e cpfEncrypted sao expurgados
    const updated = await this.titularRepo.anonymizeInPlace(buyer.id, {
      name: "[DADO PESSOAL ANONIMIZADO - LGPD ART. 18]",
      email: `anonimizado-${buyer.id.slice(0, 8)}@lgpd.cinedoom.local`,
      cpfHash: dummyHash,
      cpfEncrypted: dummyEncrypted,
      anonymizedAt: now,
    });

    return {
      buyerId: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      email: updated.email,
      anonymizedAt: updated.anonymizedAt || now,
      ticketsPreserved,
      message: "Dados pessoais do comprador anonimizados com sucesso em conformidade com o Art. 18 da LGPD (ADR-009).",
    };
  }

  /**
   * Consulta os dados de um titular pelo CPF ou ID para auditoria antes da anonimizacao.
   */
  async findTitular(cpfOrId: string, tenantId: string): Promise<TitularDetails | null> {
    if (!cpfOrId || !tenantId) return null;

    const trimmed = cpfOrId.trim();
    const sanitizedCpf = sanitizeCPF(trimmed);
    const isCpf = sanitizedCpf.length === 11;

    let buyer = null;
    if (isCpf) {
      const cpfHash = CryptoService.hashCPF(sanitizedCpf);
      buyer = await this.titularRepo.findByCpfHash(cpfHash, tenantId);
    } else {
      buyer = await this.titularRepo.findById(trimmed, tenantId);
    }

    if (!buyer) return null;

    let plainCpf = "";
    if (buyer.anonymizedAt) {
      plainCpf = "00000000000";
    } else {
      try {
        plainCpf = CryptoService.decryptCPF(buyer.cpfEncrypted);
      } catch {
        plainCpf = "00000000000";
      }
    }

    return {
      id: buyer.id,
      tenantId: buyer.tenantId,
      name: buyer.name,
      email: buyer.email,
      cpfMasked: buyer.anonymizedAt ? "***.***.***-**" : maskCPF(plainCpf),
      isAnonymized: buyer.anonymizedAt !== null,
      anonymizedAt: buyer.anonymizedAt,
      lgpdConsentAt: buyer.lgpdConsentAt,
      ticketsCount: buyer._count?.tickets ?? 0,
    };
  }
}

export const AnonymizationService = new AnonymizationServiceClass();
export const anonymizeTitular = AnonymizationService.anonymizeTitular.bind(AnonymizationService);
export const findTitular = AnonymizationService.findTitular.bind(AnonymizationService);
