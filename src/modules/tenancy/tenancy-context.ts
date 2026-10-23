import { AsyncLocalStorage } from "node:async_hooks";

export interface TenancyStore {
  tenantId: string;
}

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantContextError";
  }
}

const tenancyStorage = new AsyncLocalStorage<TenancyStore>();

/**
 * Executa uma funcao dentro do escopo isolado de um tenant.
 * Qualquer operacao assincrona executada dentro deste callback tera acesso ao tenantId.
 */
export async function runWithTenant<T>(tenantId: string, fn: () => Promise<T> | T): Promise<T> {
  if (!tenantId || typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new TenantContextError("tenantId invalido fornecido para runWithTenant");
  }
  return tenancyStorage.run({ tenantId: tenantId.trim() }, async () => {
    return await fn();
  });
}

/**
 * Retorna o tenantId atual do contexto, ou null se estiver fora de escopo.
 */
export function getTenantId(): string | null {
  const store = tenancyStorage.getStore();
  return store ? store.tenantId : null;
}

/**
 * Retorna o tenantId obrigatorio do contexto, ou lanca erro se ausente.
 */
export function requireTenantId(): string {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new TenantContextError(
      "Contexto de tenant obrigatorio ausente no ciclo da requisicao (AC-4 / TC-19)"
    );
  }
  return tenantId;
}
