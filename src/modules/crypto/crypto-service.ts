import crypto from "node:crypto";

/**
 * Constantes Criptograficas CineDoom
 * Conformidade: ADR-008, AC-6, ISO/IEC/IEEE 12207:2021
 */
const AES_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // 96-bit recomendado para GCM
const TAG_LENGTH_BYTES = 16; // 128-bit authentication tag

const DEFAULT_DEV_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const DEFAULT_DEV_HMAC_KEY =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

/**
 * Obtem a chave simetrica de 32 bytes (256 bits) para o AES-256-GCM.
 */
export function getEncryptionKey(overrideKey?: Buffer | string): Buffer {
  if (overrideKey) {
    if (Buffer.isBuffer(overrideKey)) {
      if (overrideKey.length !== 32) {
        throw new Error("Chave de criptografia AES-256 deve ter exatamente 32 bytes.");
      }
      return overrideKey;
    }
    return parseKeyString(overrideKey);
  }

  const envKey = process.env.CINEDOOM_CPF_KEY || DEFAULT_DEV_KEY_HEX;
  return parseKeyString(envKey);
}

function parseKeyString(keyStr: string): Buffer {
  const trimmed = keyStr.trim();
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  if (trimmed.length === 44 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 32) return buf;
  }
  const utf8Buf = Buffer.from(trimmed, "utf8");
  if (utf8Buf.length === 32) {
    return utf8Buf;
  }
  // Se for uma string arbitraria em ambiente de teste, deriva 32 bytes via sha256
  return crypto.createHash("sha256").update(trimmed).digest();
}

/**
 * Obtem a chave secreta de servidor para HMAC-SHA256 (blind index).
 */
export function getHmacKey(overrideKey?: string): string {
  if (overrideKey && overrideKey.trim().length > 0) {
    return overrideKey.trim();
  }
  return (process.env.CINEDOOM_CPF_HMAC_KEY || DEFAULT_DEV_HMAC_KEY).trim();
}

/**
 * Remove qualquer caractere nao numerico do CPF.
 */
export function sanitizeCPF(cpf: string): string {
  if (!cpf) return "";
  return cpf.replace(/\D/g, "");
}

/**
 * Valida a integridade formal do CPF brasileiro atraves dos digitos verificadores (Modulo 11).
 */
export function validateCPF(rawCpf: string): boolean {
  const cpf = sanitizeCPF(rawCpf);

  if (cpf.length !== 11) {
    return false;
  }

  // Rejeita sequencias com todos os digitos repetidos (e.g. 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  // Primeiro digito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let firstCheck = 11 - (sum % 11);
  if (firstCheck >= 10) firstCheck = 0;

  if (firstCheck !== Number.parseInt(cpf.charAt(9), 10)) {
    return false;
  }

  // Segundo digito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  let secondCheck = 11 - (sum % 11);
  if (secondCheck >= 10) secondCheck = 0;

  return secondCheck === Number.parseInt(cpf.charAt(10), 10);
}

/**
 * Formata CPF numerico no padrao 000.000.000-00.
 */
export function formatCPF(rawCpf: string): string {
  const sanitized = sanitizeCPF(rawCpf);
  if (sanitized.length !== 11) return sanitized;
  return sanitized.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Gera um CPF matematicamente valido e aleatorio segundo o algoritmo oficial do Modulo 11.
 * Utilizado para testes e homologacao em ambiente de deploy.
 */
export function generateRandomValidCPF(): string {
  let digits: number[];
  do {
    digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (digits.every((d) => d === digits[0]));

  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * (10 - i);
  }
  let rest1 = 11 - (sum1 % 11);
  const dv1 = rest1 >= 10 ? 0 : rest1;
  digits.push(dv1);

  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += digits[i] * (11 - i);
  }
  let rest2 = 11 - (sum2 % 11);
  const dv2 = rest2 >= 10 ? 0 : rest2;
  digits.push(dv2);

  const d = digits.join("");
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

/**
 * Mascara o CPF para exibicao em telas operacionais sem expor PII completa (AC-6 / LGPD).
 * Exemplo: 123.456.789-01 -> ***.***.789-01
 */
export function maskCPF(rawCpf: string): string {
  const sanitized = sanitizeCPF(rawCpf);
  if (sanitized.length !== 11) return "***.***.***-**";
  const formatted = formatCPF(sanitized);
  return `***.***.${formatted.slice(8)}`;
}

/**
 * Criptografa o CPF utilizando AES-256-GCM.
 * Formato do payload retornado: base64(IV [12 bytes] + AuthTag [16 bytes] + Ciphertext)
 */
export function encryptCPF(rawCpf: string, keyOverride?: Buffer | string): string {
  const sanitized = sanitizeCPF(rawCpf);
  if (!sanitized) {
    throw new Error("CPF invalido ou vazio para criptografia.");
  }

  const key = getEncryptionKey(keyOverride);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(sanitized, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Concatena IV + AuthTag + Ciphertext e converte para base64
  const payloadBuffer = Buffer.concat([iv, authTag, encrypted]);
  return payloadBuffer.toString("base64");
}

/**
 * Descriptografa o payload AES-256-GCM retornando o CPF sanitizado em texto claro.
 * Garante autenticidade e integridade dos dados via Auth Tag.
 */
export function decryptCPF(payloadBase64: string, keyOverride?: Buffer | string): string {
  if (!payloadBase64 || typeof payloadBase64 !== "string") {
    throw new Error("Payload criptografado invalido.");
  }

  const buffer = Buffer.from(payloadBase64, "base64");
  const minLength = IV_LENGTH_BYTES + TAG_LENGTH_BYTES;

  if (buffer.length <= minLength) {
    throw new Error("Payload criptografado corrompido ou incompleto.");
  }

  const iv = buffer.subarray(0, IV_LENGTH_BYTES);
  const authTag = buffer.subarray(IV_LENGTH_BYTES, minLength);
  const ciphertext = buffer.subarray(minLength);

  const key = getEncryptionKey(keyOverride);
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(
      `Falha na autenticacao ou decifracao do CPF (GCM Auth Tag invalida ou chave incorreta): ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

/**
 * Gera o hash cego deterministico (blind index) do CPF utilizando HMAC-SHA256.
 * Previne ataques de rainbow table e enumeracao sobre o espaco finito de CPFs (ADR-008).
 * Retorna uma string hexadecimal de 64 caracteres em minusculas.
 */
export function hashCPF(rawCpf: string, hmacKeyOverride?: string): string {
  const sanitized = sanitizeCPF(rawCpf);
  if (!sanitized) {
    throw new Error("CPF invalido ou vazio para geracao de blind index.");
  }

  const key = getHmacKey(hmacKeyOverride);
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(sanitized, "utf8");
  return hmac.digest("hex").toLowerCase();
}

/**
 * Objeto singleton de servico para injecao / consumo facil.
 * Componente: C-4 (CryptoService)
 */
export const CryptoService = {
  getEncryptionKey,
  getHmacKey,
  sanitizeCPF,
  validateCPF,
  formatCPF,
  maskCPF,
  encryptCPF,
  decryptCPF,
  hashCPF,
};
