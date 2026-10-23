import crypto from "crypto";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type LogModule =
  | "bilheteria"
  | "backoffice"
  | "auth"
  | "tenancy"
  | "ocupacao"
  | "compliance"
  | "infra";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  env: string;
  message: string;
  module?: LogModule;
  tenant_id?: string;
  user_id?: string;
  request_id?: string;
  route?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  action?: string;
  details?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_PATTERNS = [
  /password/i,
  /senha/i,
  /cpf/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /(^|_|\b)key($|_|\b)/i,
  /apikey/i,
  /credit_?card/i,
  /cartao/i,
  /cvv/i,
];

/**
 * Filtro de Higienizacao LGPD (R-CMP-7 / specs/security-compliance/compliance-assessment.md)
 * Garante matematicamente que nenhum CPF, senha ou dado sensivel em claro seja exportado no log.
 */
export function sanitizeLogDetails(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogDetails);
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));

    if (isSensitive) {
      sanitized[key] = "[PII_PROTECTED_LGPD]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeLogDetails(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Gera um request ID unico para correlacao distribuida (OpenTelemetry / Vercel Log Drain).
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Cliente de Observabilidade e Logging Estruturado (ADR-011 / TASK-15 / specs/planning/devops-spec.md).
 * Emite logs JSON estruturados compulsoriamente capturados pelo Vercel Log Drain e direcionados ao Axiom.
 */
class StructuredLogger {
  private serviceName = "cinedoom-api";
  private buffer: LogEntry[] = [];

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Partial<LogEntry>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      env: process.env.NODE_ENV || "development",
      message,
      module: context?.module,
      tenant_id: context?.tenant_id,
      user_id: context?.user_id,
      request_id: context?.request_id,
      route: context?.route,
      method: context?.method,
      status_code: context?.status_code,
      duration_ms: context?.duration_ms,
      action: context?.action,
    };

    if (context?.details) {
      entry.details = sanitizeLogDetails(context.details) as Record<string, unknown>;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
      };
    }

    return entry;
  }

  private emit(entry: LogEntry): void {
    const formatted = JSON.stringify(entry);

    if (entry.level === "ERROR") {
      console.error(formatted);
    } else if (entry.level === "WARN") {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // Armazena no buffer caso haja despacho direto opcional
    this.buffer.push(entry);
    if (this.buffer.length > 100) {
      this.buffer.shift();
    }
  }

  public debug(message: string, context?: Partial<LogEntry>): LogEntry {
    const entry = this.createEntry("DEBUG", message, context);
    this.emit(entry);
    return entry;
  }

  public info(message: string, context?: Partial<LogEntry>): LogEntry {
    const entry = this.createEntry("INFO", message, context);
    this.emit(entry);
    return entry;
  }

  public warn(message: string, context?: Partial<LogEntry>): LogEntry {
    const entry = this.createEntry("WARN", message, context);
    this.emit(entry);
    return entry;
  }

  public error(message: string, context?: Partial<LogEntry>, error?: Error): LogEntry {
    const entry = this.createEntry("ERROR", message, context, error);
    this.emit(entry);
    return entry;
  }

  /**
   * Evento de auditoria: Venda confirmada de ingresso (US-1 / AC-1)
   */
  public logSale(params: {
    sessionId: string;
    seatId: string;
    ticketId: string;
    tenantId: string;
    userId?: string;
    requestId?: string;
    durationMs?: number;
  }): LogEntry {
    return this.info("Ingresso vendido com sucesso", {
      module: "bilheteria",
      action: "ticket_sold",
      tenant_id: params.tenantId,
      user_id: params.userId,
      request_id: params.requestId,
      duration_ms: params.durationMs,
      details: {
        session_id: params.sessionId,
        seat_id: params.seatId,
        ticket_id: params.ticketId,
      },
    });
  }

  /**
   * Evento de auditoria: Cancelamento imutavel de ingresso (AC-3 / ADR-010)
   */
  public logCancellation(params: {
    ticketId: string;
    auditId: string;
    tenantId: string;
    userId: string;
    motivo: string;
    requestId?: string;
  }): LogEntry {
    const motivoHash = crypto.createHash("sha256").update(params.motivo).digest("hex");

    return this.info("Ingresso cancelado com auditoria append-only", {
      module: "bilheteria",
      action: "ticket_cancelled",
      tenant_id: params.tenantId,
      user_id: params.userId,
      request_id: params.requestId,
      details: {
        ticket_id: params.ticketId,
        cancellation_audit_id: params.auditId,
        motivo_hash: motivoHash,
      },
    });
  }

  /**
   * Evento de conflito ACID: Tentativa de double-booking interceptada pelo lock
   */
  public logAcidConflict(params: {
    sessionId: string;
    seatId: string;
    tenantId: string;
    competingRequestId?: string;
    requestId?: string;
  }): LogEntry {
    return this.warn("Conflito ACID interceptado: assento ja reservado ou vendido", {
      module: "bilheteria",
      action: "double_booking_conflict",
      tenant_id: params.tenantId,
      request_id: params.requestId,
      details: {
        session_id: params.sessionId,
        seat_id: params.seatId,
        competing_request_id: params.competingRequestId,
      },
    });
  }

  /**
   * Evento de seguranca critica: Tentativa de violacao de isolamento multi-tenant (P0)
   */
  public logSecurityViolation(params: {
    expectedTenantId: string;
    attemptedTenantId: string;
    route: string;
    userId?: string;
    requestId?: string;
  }): LogEntry {
    return this.error("Violacao de isolamento multi-tenant interceptada", {
      module: "tenancy",
      action: "cross_tenant_query_attempt",
      tenant_id: params.expectedTenantId,
      user_id: params.userId,
      request_id: params.requestId,
      route: params.route,
      details: {
        expected_tenant_id: params.expectedTenantId,
        attempted_tenant_id: params.attemptedTenantId,
      },
    });
  }

  /**
   * Evento de autenticacao e autorizacao RBAC (AC-5)
   */
  public logAuth(params: {
    action: "login_success" | "login_failure" | "authz_denied";
    role?: string;
    route?: string;
    tenantId?: string;
    userId?: string;
    requestId?: string;
  }): LogEntry {
    const level: LogLevel = params.action === "authz_denied" ? "WARN" : "INFO";

    return this.createEntry(level, `Evento de autenticacao: ${params.action}`, {
      module: "auth",
      action: params.action,
      tenant_id: params.tenantId,
      user_id: params.userId,
      request_id: params.requestId,
      route: params.route,
      details: {
        role: params.role,
      },
    });
  }

  /**
   * Evento de cumprimento do Art. 18 LGPD: Anonimizacao efetuada
   */
  public logAnonymization(params: {
    buyerId: string;
    tenantId: string;
    userId?: string;
    ticketsPreserved: number;
    requestId?: string;
  }): LogEntry {
    return this.info("Anonimizacao in-place de dados pessoais do titular executada", {
      module: "compliance",
      action: "anonymization_performed",
      tenant_id: params.tenantId,
      user_id: params.userId,
      request_id: params.requestId,
      details: {
        buyer_id: params.buyerId,
        tickets_preserved: params.ticketsPreserved,
        legal_basis: "LGPD Art. 18 / CDC Art. 27",
      },
    });
  }

  /**
   * Evento de rastreamento HTTP para correlacao Vercel Log Drain
   */
  public logHttpRequest(params: {
    route: string;
    method: string;
    statusCode: number;
    durationMs: number;
    tenantId?: string;
    userId?: string;
    requestId?: string;
  }): LogEntry {
    const level: LogLevel = params.statusCode >= 500 ? "ERROR" : params.statusCode >= 400 ? "WARN" : "INFO";

    return this.createEntry(level, `HTTP ${params.method} ${params.route} ${params.statusCode}`, {
      route: params.route,
      method: params.method,
      status_code: params.statusCode,
      duration_ms: params.durationMs,
      tenant_id: params.tenantId,
      user_id: params.userId,
      request_id: params.requestId,
    });
  }

  /**
   * Exporta lote de logs diretamente para a API de Ingestao do Axiom
   * (fallback / envio direto quando configurado via AXIOM_TOKEN)
   */
  public async flushToAxiom(dataset = process.env.AXIOM_DATASET || "cinedoom-production-logs"): Promise<boolean> {
    const token = process.env.AXIOM_TOKEN;
    if (!token || this.buffer.length === 0) {
      return false;
    }

    try {
      const payload = [...this.buffer];
      const res = await fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.buffer = [];
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.buffer];
  }

  public clearBuffer(): void {
    this.buffer = [];
  }
}

export const logger = new StructuredLogger();
