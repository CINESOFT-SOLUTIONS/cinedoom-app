import { describe, it, expect } from "vitest";
import {
  UserRole,
  SeatStatus,
  SessionStatus,
  SessionSeatStatus,
  TicketStatus,
  ReservationStatus,
} from "@prisma/client";
import fs from "fs";
import path from "path";

describe("Database Schema & Prisma Model Integrity", () => {
  it("deve conter todos os enums do dominio CineDoom mapeados na spec", () => {
    // UserRole
    expect(UserRole.ATENDENTE).toBe("ATENDENTE");
    expect(UserRole.GERENTE).toBe("GERENTE");
    expect(UserRole.CLIENTE).toBe("CLIENTE");

    // SeatStatus
    expect(SeatStatus.AVAILABLE).toBe("AVAILABLE");
    expect(SeatStatus.BLOCKED).toBe("BLOCKED");

    // SessionStatus
    expect(SessionStatus.SCHEDULED).toBe("SCHEDULED");
    expect(SessionStatus.OPEN).toBe("OPEN");
    expect(SessionStatus.CLOSED).toBe("CLOSED");
    expect(SessionStatus.CANCELLED).toBe("CANCELLED");

    // SessionSeatStatus (incluindo RESERVED do Portal do Cliente)
    expect(SessionSeatStatus.AVAILABLE).toBe("AVAILABLE");
    expect(SessionSeatStatus.RESERVED).toBe("RESERVED");
    expect(SessionSeatStatus.SOLD).toBe("SOLD");
    expect(SessionSeatStatus.BLOCKED).toBe("BLOCKED");

    // TicketStatus
    expect(TicketStatus.SOLD).toBe("SOLD");
    expect(TicketStatus.CANCELLED).toBe("CANCELLED");

    // ReservationStatus (JIT expiration)
    expect(ReservationStatus.PENDING).toBe("PENDING");
    expect(ReservationStatus.CONFIRMED).toBe("CONFIRMED");
    expect(ReservationStatus.CANCELLED).toBe("CANCELLED");
    expect(ReservationStatus.EXPIRED).toBe("EXPIRED");
  });

  it("o arquivo schema.prisma deve conter as 11 entidades de negocio com mapeamento multi-tenant", () => {
    const schemaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
    const content = fs.readFileSync(schemaPath, "utf-8");

    const expectedEntities = [
      "model Tenant",
      "model User",
      "model Film",
      "model Room",
      "model Seat",
      "model Session",
      "model Reservation",
      "model SessionSeat",
      "model Buyer",
      "model Ticket",
      "model CancellationAudit",
    ];

    for (const entity of expectedEntities) {
      expect(content).toContain(entity);
    }

    // Campo tenant_id em todas as entidades transacionais
    expect(content).toContain("@map(\"tenant_id\")");
    // Trava de unicidade de assento por sessao
    expect(content).toContain("@@unique([sessionId, seatId])");
  });

  it("ADR-010: triggers.sql deve conter a trigger append-only de cancelamento imutavel", () => {
    const triggerPath = path.resolve(__dirname, "../../prisma/triggers.sql");
    const content = fs.readFileSync(triggerPath, "utf-8");

    expect(content).toContain("CREATE OR REPLACE FUNCTION prevent_cancellation_audit_modification");
    expect(content).toContain("RAISE EXCEPTION");
    expect(content).toContain("BEFORE UPDATE OR DELETE ON cancellation_audits");
    expect(content).toContain("FOR EACH ROW");
  });
});
