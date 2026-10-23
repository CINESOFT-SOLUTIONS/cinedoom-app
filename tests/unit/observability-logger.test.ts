import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  logger,
  sanitizeLogDetails,
  generateRequestId,
  LogEntry,
} from "@/shared/logger";

describe("Observabilidade — Structured Logging & Axiom Log Drain (TASK-15 / AC-3 / ADR-011)", () => {
  beforeEach(() => {
    logger.clearBuffer();
    vi.restoreAllMocks();
  });

  describe("Formato Estruturado JSON & Campos Obrigatórios (devops-spec.md)", () => {
    it("deve gerar log estruturado com campos obrigatórios: timestamp, level, service, env", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const entry = logger.info("Mensagem de teste de auditoria", {
        module: "bilheteria",
        tenant_id: "tenant-uuid-1",
        user_id: "user-uuid-1",
      });

      expect(entry.service).toBe("cinedoom-api");
      expect(entry.level).toBe("INFO");
      expect(entry.message).toBe("Mensagem de teste de auditoria");
      expect(entry.module).toBe("bilheteria");
      expect(entry.tenant_id).toBe("tenant-uuid-1");
      expect(entry.user_id).toBe("user-uuid-1");
      expect(entry.timestamp).toBeDefined();

      // Certifica que emite JSON válido para Vercel Log Drain
      expect(consoleSpy).toHaveBeenCalled();
      const emittedRaw = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(emittedRaw);
      expect(parsed.service).toBe("cinedoom-api");
      expect(parsed.message).toBe("Mensagem de teste de auditoria");
    });

    it("generateRequestId gera UUID v4 único para correlação de rastreamento", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("logger.error emite via console.error com informações do erro", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("Falha de conexão com banco de dados");

      const entry = logger.error("Erro operacional no servidor", { module: "infra" }, err);

      expect(entry.level).toBe("ERROR");
      expect(entry.error?.name).toBe("Error");
      expect(entry.error?.message).toBe("Falha de conexão com banco de dados");
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("Sanitização de Dados Sensíveis e PII (LGPD R-CMP-7)", () => {
    it("sanitizeLogDetails substitui chaves sensíveis (cpf, senha, password, token) por tag de proteção", () => {
      const rawDetails = {
        name: "Comprador Anonimo",
        cpf: "123.456.789-00",
        cpf_encrypted: "cifrado-aes",
        password: "SuperSecretPassword123",
        token: "bearer-jwt-token",
        nested: {
          senhaOperador: "123456",
          allowedKey: "valor_permitido",
        },
      };

      const sanitized: any = sanitizeLogDetails(rawDetails);

      expect(sanitized.cpf).toBe("[PII_PROTECTED_LGPD]");
      expect(sanitized.cpf_encrypted).toBe("[PII_PROTECTED_LGPD]");
      expect(sanitized.password).toBe("[PII_PROTECTED_LGPD]");
      expect(sanitized.token).toBe("[PII_PROTECTED_LGPD]");
      expect(sanitized.nested.senhaOperador).toBe("[PII_PROTECTED_LGPD]");
      expect(sanitized.nested.allowedKey).toBe("valor_permitido");
    });
  });

  describe("Eventos Críticos de Negócio e Segurança", () => {
    it("logSale registra venda com action ticket_sold", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      const entry = logger.logSale({
        sessionId: "sess-1",
        seatId: "seat-a1",
        ticketId: "tick-99",
        tenantId: "tenant-1",
        userId: "user-atendente",
        durationMs: 120,
      });

      expect(entry.action).toBe("ticket_sold");
      expect(entry.module).toBe("bilheteria");
      expect(entry.details?.ticket_id).toBe("tick-99");
      expect(entry.duration_ms).toBe(120);
    });

    it("logCancellation calcula hash SHA-256 do motivo e não expõe motivo em texto claro", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      const rawMotivo = "Cliente solicitou reembolso por imprevisto familiar";
      const entry = logger.logCancellation({
        ticketId: "tick-99",
        auditId: "audit-123",
        tenantId: "tenant-1",
        userId: "user-gerente",
        motivo: rawMotivo,
      });

      expect(entry.action).toBe("ticket_cancelled");
      expect(entry.details?.ticket_id).toBe("tick-99");
      expect(entry.details?.cancellation_audit_id).toBe("audit-123");
      expect(entry.details?.motivo_hash).toBeDefined();
      expect(typeof entry.details?.motivo_hash).toBe("string");
      expect(entry.details?.motivo_hash).not.toBe(rawMotivo);
    });

    it("logAcidConflict registra evento com level WARN e action double_booking_conflict", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});

      const entry = logger.logAcidConflict({
        sessionId: "sess-1",
        seatId: "seat-a1",
        tenantId: "tenant-1",
        competingRequestId: "req-competidora-123",
      });

      expect(entry.level).toBe("WARN");
      expect(entry.action).toBe("double_booking_conflict");
      expect(entry.details?.competing_request_id).toBe("req-competidora-123");
    });

    it("logSecurityViolation registra violação cross-tenant com level ERROR (P0)", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      const entry = logger.logSecurityViolation({
        expectedTenantId: "tenant-vitima",
        attemptedTenantId: "tenant-atacante",
        route: "/api/filmes/film-123",
      });

      expect(entry.level).toBe("ERROR");
      expect(entry.action).toBe("cross_tenant_query_attempt");
      expect(entry.details?.expected_tenant_id).toBe("tenant-vitima");
      expect(entry.details?.attempted_tenant_id).toBe("tenant-atacante");
    });

    it("logAnonymization registra cumprimento do Art. 18 da LGPD", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      const entry = logger.logAnonymization({
        buyerId: "buyer-uuid-1",
        tenantId: "tenant-1",
        ticketsPreserved: 5,
      });

      expect(entry.module).toBe("compliance");
      expect(entry.action).toBe("anonymization_performed");
      expect(entry.details?.buyer_id).toBe("buyer-uuid-1");
      expect(entry.details?.tickets_preserved).toBe(5);
    });

    it("logHttpRequest formata métricas de requisição e duração em ms", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      const entry = logger.logHttpRequest({
        route: "/api/vendas",
        method: "POST",
        statusCode: 201,
        durationMs: 145,
        tenantId: "tenant-1",
      });

      expect(entry.route).toBe("/api/vendas");
      expect(entry.method).toBe("POST");
      expect(entry.status_code).toBe(201);
      expect(entry.duration_ms).toBe(145);
    });
  });

  describe("Despacho para Axiom API Ingestion", () => {
    it("flushToAxiom retorna false sem quebrar quando AXIOM_TOKEN não está configurado", async () => {
      delete process.env.AXIOM_TOKEN;
      logger.info("Log sem token configurado");

      const success = await logger.flushToAxiom();
      expect(success).toBe(false);
    });

    it("flushToAxiom envia lote via HTTP POST para o endpoint do dataset", async () => {
      process.env.AXIOM_TOKEN = "test-token";
      process.env.AXIOM_DATASET = "cinedoom-production-logs";

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
      } as any);

      logger.info("Log teste 1");
      logger.info("Log teste 2");

      const success = await logger.flushToAxiom();
      expect(success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.axiom.co/v1/datasets/cinedoom-production-logs/ingest",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });
});
