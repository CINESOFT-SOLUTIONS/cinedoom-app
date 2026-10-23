import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import {
  CryptoService,
  sanitizeCPF,
  validateCPF,
  formatCPF,
  maskCPF,
  encryptCPF,
  decryptCPF,
  hashCPF,
  getEncryptionKey,
} from "@/modules/crypto";
import {
  validateBuyerInput,
  registerBuyer,
  findBuyerByCPF,
  ValidationError,
} from "@/modules/compradores";
import { rawPrisma } from "@/shared/db/prisma";

// Mock de rawPrisma para testes unitarios isolados
vi.mock("@/shared/db/prisma", () => {
  const mockBuyer = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  return {
    rawPrisma: {
      buyer: mockBuyer,
    },
    prisma: {
      buyer: mockBuyer,
    },
  };
});

describe("CryptoService — Criptografia LGPD & Blind Index (ADR-008 / AC-6)", () => {
  // CPF valido gerado pelo algoritmo padrao
  const VALID_CPF_RAW = "529.982.247-25";
  const VALID_CPF_CLEAN = "52998224725";
  const ANOTHER_VALID_CPF = "11144477735";

  describe("Sanitizacao e Validacao de CPF", () => {
    it("deve remover caracteres nao-numericos corretamente", () => {
      expect(sanitizeCPF("123.456.789-00")).toBe("12345678900");
      expect(sanitizeCPF(" 999 888 777 - 66 ")).toBe("99988877766");
      expect(sanitizeCPF("")).toBe("");
    });

    it("deve validar CPFs com digitos verificadores corretos", () => {
      expect(validateCPF(VALID_CPF_RAW)).toBe(true);
      expect(validateCPF(VALID_CPF_CLEAN)).toBe(true);
      expect(validateCPF(ANOTHER_VALID_CPF)).toBe(true);
    });

    it("deve rejeitar CPFs com digitos verificadores invalidos", () => {
      expect(validateCPF("123.456.789-00")).toBe(false);
      expect(validateCPF("52998224726")).toBe(false);
    });

    it("deve rejeitar sequencias com 11 digitos repetidos", () => {
      expect(validateCPF("111.111.111-11")).toBe(false);
      expect(validateCPF("00000000000")).toBe(false);
      expect(validateCPF("99999999999")).toBe(false);
    });

    it("deve rejeitar CPFs com comprimento diferente de 11 digitos", () => {
      expect(validateCPF("123456789")).toBe(false);
      expect(validateCPF("1234567890123")).toBe(false);
    });

    it("deve formatar CPF no padrao brasileiro", () => {
      expect(formatCPF(VALID_CPF_CLEAN)).toBe("529.982.247-25");
    });

    it("deve mascarar CPF para exibicao protegida (AC-6 / LGPD)", () => {
      expect(maskCPF(VALID_CPF_CLEAN)).toBe("***.***.247-25");
      expect(maskCPF("invalido")).toBe("***.***.***-**");
    });
  });

  describe("AES-256-GCM — Cifracao e Decifracao Reversivel", () => {
    it("deve cifrar e decifrar CPF recuperando o valor original sanitizado", () => {
      const encrypted = encryptCPF(VALID_CPF_RAW);
      expect(typeof encrypted).toBe("string");
      expect(encrypted).not.toContain(VALID_CPF_CLEAN);

      const decrypted = decryptCPF(encrypted);
      expect(decrypted).toBe(VALID_CPF_CLEAN);
    });

    it("deve gerar ciphertexts distintos para o mesmo CPF devido ao IV aleatorio de 12 bytes", () => {
      const encrypted1 = encryptCPF(VALID_CPF_RAW);
      const encrypted2 = encryptCPF(VALID_CPF_RAW);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decryptCPF(encrypted1)).toBe(VALID_CPF_CLEAN);
      expect(decryptCPF(encrypted2)).toBe(VALID_CPF_CLEAN);
    });

    it("deve lancar erro ao tentar decifrar com Auth Tag adulterada (integridade GCM)", () => {
      const encrypted = encryptCPF(VALID_CPF_RAW);
      const buffer = Buffer.from(encrypted, "base64");

      // Adultera um byte na regiao do ciphertext / authTag
      buffer[15] = buffer[15] ^ 0xff;
      const tamperedBase64 = buffer.toString("base64");

      expect(() => decryptCPF(tamperedBase64)).toThrow(
        /Falha na autenticacao ou decifracao do CPF/
      );
    });

    it("deve lancar erro ao decifrar com chave simetrica incorreta", () => {
      const keyA = crypto.randomBytes(32);
      const keyB = crypto.randomBytes(32);

      const encrypted = encryptCPF(VALID_CPF_RAW, keyA);
      expect(() => decryptCPF(encrypted, keyB)).toThrow(
        /Falha na autenticacao ou decifracao do CPF/
      );
    });

    it("deve rejeitar payload base64 truncado ou vazio", () => {
      expect(() => decryptCPF("")).toThrow(/Payload criptografado invalido/);
      expect(() => decryptCPF("YWJj")).toThrow(/Payload criptografado corrompido/);
    });
  });

  describe("HMAC-SHA256 — Blind Index Deterministico para Busca O(1)", () => {
    it("deve gerar hash deterministico de 64 caracteres hexadecimais em minusculas", () => {
      const hash1 = hashCPF(VALID_CPF_RAW);
      const hash2 = hashCPF(VALID_CPF_CLEAN);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("deve produzir hashes completamente distintos para CPFs diferentes (resistencia a colisoes)", () => {
      const hashA = hashCPF(VALID_CPF_RAW);
      const hashB = hashCPF(ANOTHER_VALID_CPF);

      expect(hashA).not.toBe(hashB);
    });

    it("deve alterar o hash se a chave secreta de HMAC for alterada", () => {
      const hashSecret1 = hashCPF(VALID_CPF_RAW, "secret-key-1-very-secure");
      const hashSecret2 = hashCPF(VALID_CPF_RAW, "secret-key-2-very-secure");

      expect(hashSecret1).not.toBe(hashSecret2);
    });

    it("deve lancar erro se CPF for vazio na geracao de blind index", () => {
      expect(() => hashCPF("")).toThrow(/CPF invalido ou vazio/);
    });
  });
});

describe("CompradoresModule — Cadastro LGPD e Validacao (TC-6 / TC-14 / AC-6)", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const validCpf = "529.982.247-25";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TC-14: Rejeita cadastro quando campo obrigatorio esta ausente", () => {
    it("rejeita quando nome esta ausente", () => {
      expect(() =>
        validateBuyerInput({
          name: "",
          cpf: validCpf,
          email: "joao@exemplo.com",
          lgpdConsent: true,
          tenantId,
        })
      ).toThrowError(/O campo "nome" e obrigatorio/);
    });

    it("rejeita quando CPF esta ausente", () => {
      expect(() =>
        validateBuyerInput({
          name: "Joao Silva",
          cpf: "",
          email: "joao@exemplo.com",
          lgpdConsent: true,
          tenantId,
        })
      ).toThrowError(/O campo "cpf" e obrigatorio/);
    });

    it("rejeita quando CPF e matematicamente invalido", () => {
      expect(() =>
        validateBuyerInput({
          name: "Joao Silva",
          cpf: "123.456.789-99",
          email: "joao@exemplo.com",
          lgpdConsent: true,
          tenantId,
        })
      ).toThrowError(/O CPF informado e invalido/);
    });

    it("rejeita quando e-mail esta ausente ou invalido", () => {
      expect(() =>
        validateBuyerInput({
          name: "Joao Silva",
          cpf: validCpf,
          email: "email-invalido",
          lgpdConsent: true,
          tenantId,
        })
      ).toThrowError(/O campo "email" e obrigatorio e deve ser valido/);
    });

    it("rejeita quando consentimento LGPD e false ou omitido", () => {
      expect(() =>
        validateBuyerInput({
          name: "Joao Silva",
          cpf: validCpf,
          email: "joao@exemplo.com",
          lgpdConsent: false,
          tenantId,
        })
      ).toThrowError(/O consentimento explicito com os termos da LGPD e obrigatorio/);
    });

    it("rejeita quando tenantId esta ausente", () => {
      expect(() =>
        validateBuyerInput({
          name: "Joao Silva",
          cpf: validCpf,
          email: "joao@exemplo.com",
          lgpdConsent: true,
          tenantId: "",
        })
      ).toThrowError(/O campo "tenantId" e obrigatorio/);
    });
  });

  describe("TC-6: Persiste comprador com CPF hasheado, CPF cifrado e consentimento LGPD", () => {
    it("deve persistir comprador sem expor CPF em texto claro e com timestamp UTC de consentimento", async () => {
      const mockCreatedBuyer = {
        id: "buyer-uuid-123",
        tenantId,
        name: "Carlos Eduardo",
        email: "carlos@cinedoom.com",
        cpfHash: hashCPF(validCpf),
        cpfEncrypted: encryptCPF(validCpf),
        lgpdConsentAt: new Date("2026-10-23T12:00:00Z"),
        createdAt: new Date("2026-10-23T12:00:00Z"),
      };

      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue(null);
      vi.mocked(rawPrisma.buyer.create).mockResolvedValue(mockCreatedBuyer as any);

      const result = await registerBuyer({
        name: "Carlos Eduardo",
        cpf: validCpf,
        email: "carlos@cinedoom.com",
        lgpdConsent: true,
        tenantId,
      });

      // Validacoes do TC-6
      expect(rawPrisma.buyer.create).toHaveBeenCalledTimes(1);
      const createCallArg = vi.mocked(rawPrisma.buyer.create).mock.calls[0][0];

      // O CPF em texto claro NAO deve constar em nenhuma propriedade enviada ao banco
      expect(createCallArg.data.cpfHash).toBe(hashCPF(validCpf));
      expect(createCallArg.data.cpfHash).toHaveLength(64);
      expect(createCallArg.data.cpfEncrypted).not.toContain(sanitizeCPF(validCpf));
      expect(createCallArg.data.lgpdConsentAt).toBeInstanceOf(Date);
      expect((createCallArg.data as any).cpf).toBeUndefined();

      // Retorno do servico deve conter CPF mascarado e dados seguros
      expect(result.cpfMasked).toBe("***.***.247-25");
      expect(result.cpfHash).toBe(hashCPF(validCpf));
      expect((result as any).cpf).toBeUndefined();
    });

    it("deve permitir busca por CPF em tempo O(1) via blind index e retornar com CPF mascarado", async () => {
      const expectedHash = hashCPF(validCpf);
      const encrypted = encryptCPF(validCpf);

      const mockFoundBuyer = {
        id: "buyer-uuid-456",
        tenantId,
        name: "Carlos Eduardo",
        email: "carlos@cinedoom.com",
        cpfHash: expectedHash,
        cpfEncrypted: encrypted,
        lgpdConsentAt: new Date(),
        createdAt: new Date(),
      };

      vi.mocked(rawPrisma.buyer.findFirst).mockResolvedValue(mockFoundBuyer as any);

      const result = await findBuyerByCPF(validCpf, tenantId);

      expect(rawPrisma.buyer.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          cpfHash: expectedHash,
        },
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Carlos Eduardo");
      expect(result?.cpfMasked).toBe("***.***.247-25");
    });
  });
});
