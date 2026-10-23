-- ============================================================
-- ADR-010: Trigger PostgreSQL Append-Only de Auditoria
-- Impede qualquer UPDATE ou DELETE na tabela cancellation_audits
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_cancellation_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Registros de auditoria de cancelamento sao estritamente imutaveis (ADR-010 / LGPD Art. 37)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_cancellation_audits ON cancellation_audits;

CREATE TRIGGER trg_protect_cancellation_audits
BEFORE UPDATE OR DELETE ON cancellation_audits
FOR EACH ROW
EXECUTE FUNCTION prevent_cancellation_audit_modification();
