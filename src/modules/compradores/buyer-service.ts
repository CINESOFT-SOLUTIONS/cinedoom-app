import { rawPrisma, prisma } from "@/shared/db/prisma";
import {
  CryptoService,
  validateCPF,
  maskCPF,
  sanitizeCPF,
} from "@/modules/crypto";

export interface RegisterBuyerInput {
  name: string;
  cpf: string;
  email: string;
  lgpdConsent: boolean;
  tenantId: string;
}

export interface BuyerResponse {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  cpfHash: string;
  cpfMasked: string;
  lgpdConsentAt: Date;
  createdAt: Date;
}

export class ValidationError extends Error {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida os dados cadastrais obrigatorios de comprador conforme AC-6 e TC-14.
 */
export function validateBuyerInput(input: Partial<RegisterBuyerInput>): RegisterBuyerInput {
  if (!input.name || typeof input.name !== "string" || input.name.trim().length === 0) {
    throw new ValidationError('O campo "nome" e obrigatorio.', "name");
  }

  if (!input.cpf || typeof input.cpf !== "string" || sanitizeCPF(input.cpf).length === 0) {
    throw new ValidationError('O campo "cpf" e obrigatorio.', "cpf");
  }

  if (!validateCPF(input.cpf)) {
    throw new ValidationError('O CPF informado e invalido.', "cpf");
  }

  if (!input.email || typeof input.email !== "string" || !EMAIL_REGEX.test(input.email.trim())) {
    throw new ValidationError('O campo "email" e obrigatorio e deve ser valido.', "email");
  }

  if (input.lgpdConsent !== true) {
    throw new ValidationError(
      'O consentimento explicito com os termos da LGPD e obrigatorio antes de prosseguir.',
      "lgpdConsent"
    );
  }

  if (!input.tenantId || typeof input.tenantId !== "string" || input.tenantId.trim().length === 0) {
    throw new ValidationError('O campo "tenantId" e obrigatorio.', "tenantId");
  }

  return {
    name: input.name.trim(),
    cpf: sanitizeCPF(input.cpf),
    email: input.email.trim().toLowerCase(),
    lgpdConsent: true,
    tenantId: input.tenantId.trim(),
  };
}

/**
 * Registra ou atualiza um comprador (Buyer) no banco de dados com criptografia de ponta a ponta.
 * Conformidade: AC-6, TC-6, TC-14, ADR-008.
 * Garante que CPF em texto claro NUNCA seja persistido no banco de dados.
 */
export async function registerBuyer(rawInput: Partial<RegisterBuyerInput>): Promise<BuyerResponse> {
  const validated = validateBuyerInput(rawInput);

  const cpfHash = CryptoService.hashCPF(validated.cpf);
  const cpfEncrypted = CryptoService.encryptCPF(validated.cpf);
  const lgpdConsentAt = new Date();

  // Upsert por tenant_id + cpf_hash para deduplicar compradores sem expor plaintext
  const existing = await rawPrisma.buyer.findFirst({
    where: {
      tenantId: validated.tenantId,
      cpfHash,
    },
  });

  let savedBuyer;
  if (existing) {
    savedBuyer = await rawPrisma.buyer.update({
      where: { id: existing.id },
      data: {
        name: validated.name,
        email: validated.email,
        cpfEncrypted,
        lgpdConsentAt,
      },
    });
  } else {
    savedBuyer = await rawPrisma.buyer.create({
      data: {
        tenantId: validated.tenantId,
        name: validated.name,
        email: validated.email,
        cpfHash,
        cpfEncrypted,
        lgpdConsentAt,
      },
    });
  }

  return {
    id: savedBuyer.id,
    tenantId: savedBuyer.tenantId,
    name: savedBuyer.name,
    email: savedBuyer.email,
    cpfHash: savedBuyer.cpfHash,
    cpfMasked: maskCPF(validated.cpf),
    lgpdConsentAt: savedBuyer.lgpdConsentAt,
    createdAt: savedBuyer.createdAt,
  };
}

/**
 * Busca comprador pelo CPF utilizando o blind index deterministico (HMAC-SHA256).
 * Busca em complexidade O(1) indexada no banco sem decifrar todos os registros.
 */
export async function findBuyerByCPF(
  rawCpf: string,
  tenantId: string
): Promise<BuyerResponse | null> {
  const sanitized = sanitizeCPF(rawCpf);
  if (!sanitized) return null;

  const cpfHash = CryptoService.hashCPF(sanitized);

  const buyer = await rawPrisma.buyer.findFirst({
    where: {
      tenantId,
      cpfHash,
    },
  });

  if (!buyer) return null;

  let plainCpf = "";
  try {
    plainCpf = CryptoService.decryptCPF(buyer.cpfEncrypted);
  } catch {
    plainCpf = sanitized;
  }

  return {
    id: buyer.id,
    tenantId: buyer.tenantId,
    name: buyer.name,
    email: buyer.email,
    cpfHash: buyer.cpfHash,
    cpfMasked: maskCPF(plainCpf),
    lgpdConsentAt: buyer.lgpdConsentAt,
    createdAt: buyer.createdAt,
  };
}

/**
 * Anonimiza comprador para cumprimento do Art. 18 da LGPD (Direito ao Esquecimento).
 * Preserva integridade referencial dos ingressos e auditoria.
 */
export async function anonymizeBuyer(buyerId: string, tenantId: string): Promise<void> {
  const buyer = await rawPrisma.buyer.findFirst({
    where: { id: buyerId, tenantId },
  });

  if (!buyer) {
    throw new ValidationError("Comprador nao encontrado para este tenant.");
  }

  // Gera hash e cifra ficticios / zerados para manter integridade das colunas
  const dummyCpf = "00000000000";
  const dummyHash = CryptoService.hashCPF(dummyCpf);
  const dummyEncrypted = CryptoService.encryptCPF(dummyCpf);

  await rawPrisma.buyer.update({
    where: { id: buyerId },
    data: {
      name: "[DADO PESSOAL ANONIMIZADO]",
      email: "anonimizado@cinedoom.local",
      cpfHash: dummyHash,
      cpfEncrypted: dummyEncrypted,
    },
  });
}

export const CompradoresService = {
  validateBuyerInput,
  registerBuyer,
  findBuyerByCPF,
  anonymizeBuyer,
};
