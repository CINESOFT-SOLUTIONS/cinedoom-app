import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createRoomSchema,
  generatePhysicalSeats,
  getRowLetter,
  RoomService,
  RoomNotFoundError,
  RoomInUseError,
} from "@/modules/backoffice";
import { rawPrisma } from "@/shared/db/prisma";
import { NextRequest } from "next/server";
import { GET as getSalas, POST as postSalas } from "@/app/api/salas/route";
import { GET as getRoomById } from "@/app/api/salas/[id]/route";
import { getServerSession } from "next-auth";

vi.mock("@/shared/db/prisma", () => {
  const mockRoom = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockSeat = {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockSession = {
    count: vi.fn(),
  };

  const $transaction = vi.fn(async (cb: (tx: any) => Promise<any>) => {
    return cb({
      room: mockRoom,
      seat: mockSeat,
      session: mockSession,
    });
  });

  return {
    rawPrisma: {
      room: mockRoom,
      seat: mockSeat,
      session: mockSession,
      $transaction,
    },
    prisma: {
      room: mockRoom,
      seat: mockSeat,
      session: mockSession,
      $transaction,
    },
  };
});

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Módulo de Salas & Geração Física de Assentos (TASK-7 / AC-5 / AC-8 / TC-13)", () => {
  const tenantId = "tenant-cinema-alphaville";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Geração Determinística da Matriz de Assentos (Seat)", () => {
    it("deve mapear corretamente os índices para as letras das fileiras (A-Z)", () => {
      expect(getRowLetter(0)).toBe("A");
      expect(getRowLetter(1)).toBe("B");
      expect(getRowLetter(25)).toBe("Z");
      expect(() => getRowLetter(26)).toThrow(/Indice de fileira invalido/);
      expect(() => getRowLetter(-1)).toThrow(/Indice de fileira invalido/);
    });

    it("TASK-7: deve gerar em lote exatamente 120 assentos físicos para uma sala 10x12", () => {
      const roomId = "room-uuid-10x12";
      const rows = 10;
      const columns = 12;

      const seats = generatePhysicalSeats(roomId, tenantId, rows, columns);

      // Quantidade total esperada
      expect(seats).toHaveLength(120);

      // Primeiro assento gerado
      expect(seats[0]).toEqual({
        roomId,
        tenantId,
        rowLabel: "A",
        columnNumber: 1,
        seatCode: "A1",
        status: "AVAILABLE",
      });

      // Ultimo assento gerado (10a fileira = J, 12a coluna = 12)
      expect(seats[seats.length - 1]).toEqual({
        roomId,
        tenantId,
        rowLabel: "J",
        columnNumber: 12,
        seatCode: "J12",
        status: "AVAILABLE",
      });

      // Todos os seatCodes devem ser estritamente únicos na mesma sala
      const seatCodes = seats.map((s) => s.seatCode);
      const uniqueCodes = new Set(seatCodes);
      expect(uniqueCodes.size).toBe(120);
    });
  });

  describe("Validação de Schemas Zod de Sala", () => {
    it("deve aprovar dados válidos de sala", () => {
      const validData = {
        name: "Sala 1 IMAX",
        rows: 8,
        columns: 14,
      };

      const result = createRoomSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Sala 1 IMAX");
        expect(result.data.rows).toBe(8);
        expect(result.data.columns).toBe(14);
      }
    });

    it("deve rejeitar quando o nome for omitido ou vazio", () => {
      expect(createRoomSchema.safeParse({ rows: 5, columns: 10 }).success).toBe(false);
      expect(createRoomSchema.safeParse({ name: "  ", rows: 5, columns: 10 }).success).toBe(false);
    });

    it("deve rejeitar quando o número de fileiras for menor que 1 ou maior que 26", () => {
      expect(createRoomSchema.safeParse({ name: "Sala", rows: 0, columns: 10 }).success).toBe(false);
      expect(createRoomSchema.safeParse({ name: "Sala", rows: 27, columns: 10 }).success).toBe(false);
    });

    it("deve rejeitar quando o número de colunas for menor que 1 ou maior que 50", () => {
      expect(createRoomSchema.safeParse({ name: "Sala", rows: 5, columns: 0 }).success).toBe(false);
      expect(createRoomSchema.safeParse({ name: "Sala", rows: 5, columns: 51 }).success).toBe(false);
    });
  });

  describe("RoomService (Transação ACID de Criação & Gestão)", () => {
    it("createRoom deve persistir Room e inserir assentos em lote via createMany", async () => {
      const mockCreatedRoom = {
        id: "new-room-id",
        tenantId,
        name: "Sala VIP",
        capacity: 40,
        layoutMetadata: { rows: 4, columns: 10, totalSeats: 40 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(rawPrisma.room.create).mockResolvedValue(mockCreatedRoom as any);
      vi.mocked(rawPrisma.seat.createMany).mockResolvedValue({ count: 40 } as any);

      const result = await RoomService.createRoom(
        { name: "Sala VIP", rows: 4, columns: 10 },
        tenantId
      );

      expect(rawPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(rawPrisma.room.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          name: "Sala VIP",
          capacity: 40,
          layoutMetadata: { rows: 4, columns: 10, totalSeats: 40 },
        },
      });
      expect(rawPrisma.seat.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ seatCode: "A1" }),
          expect.objectContaining({ seatCode: "D10" }),
        ]),
      });
      expect(result.seatsGeneratedCount).toBe(40);
    });

    it("getRoomById deve lançar RoomNotFoundError se sala não existir para o tenant", async () => {
      vi.mocked(rawPrisma.room.findFirst).mockResolvedValue(null);

      await expect(RoomService.getRoomById("room-nao-existe", tenantId)).rejects.toThrow(
        RoomNotFoundError
      );
    });

    it("deleteRoom deve impedir exclusão se houver sessões atreladas à sala", async () => {
      vi.mocked(rawPrisma.room.findFirst).mockResolvedValue({
        id: "room-em-uso",
        name: "Sala 2",
        tenantId,
      } as any);

      vi.mocked(rawPrisma.session.count).mockResolvedValue(2);

      await expect(RoomService.deleteRoom("room-em-uso", tenantId)).rejects.toThrow(
        RoomInUseError
      );
      expect(rawPrisma.room.delete).not.toHaveBeenCalled();
    });
  });

  describe("Route Handlers /api/salas (Controle de Acesso RBAC)", () => {
    it("AC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar POST /api/salas", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/salas", {
        method: "POST",
        body: JSON.stringify({
          name: "Sala Invasora",
          rows: 5,
          columns: 8,
        }),
      });

      const response = await postSalas(request);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
    });

    it("TC-13 / AC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar GET /api/salas", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/salas", {
        method: "GET",
      });

      const response = await getSalas(request);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
      expect(rawPrisma.room.findMany).not.toHaveBeenCalled();
    });

    it("POST retorna HTTP 422 quando dados de sala forem inválidos", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/salas", {
        method: "POST",
        body: JSON.stringify({
          name: "Sala Sem Dimensoes",
        }),
      });

      const response = await postSalas(request);
      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.errors).toBeDefined();
    });

    it("POST com GERENTE e dados válidos retorna HTTP 201 Created", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      const mockRoom = {
        id: "sala-101",
        tenantId,
        name: "Sala 1",
        capacity: 50,
        layoutMetadata: { rows: 5, columns: 10, totalSeats: 50 },
      };

      vi.mocked(rawPrisma.room.create).mockResolvedValue(mockRoom as any);
      vi.mocked(rawPrisma.seat.createMany).mockResolvedValue({ count: 50 } as any);

      const request = new NextRequest("http://localhost:3000/api/salas", {
        method: "POST",
        body: JSON.stringify({
          name: "Sala 1",
          rows: 5,
          columns: 10,
        }),
      });

      const response = await postSalas(request);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.name).toBe("Sala 1");
      expect(json.seatsGeneratedCount).toBe(50);
    });

    it("GET /api/salas lista as salas do tenant quando usuário for GERENTE", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.room.findMany).mockResolvedValue([
        { id: "s1", name: "Sala Principal", capacity: 100, tenantId },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/salas");
      const response = await getSalas(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Sala Principal");
    });

    it("TC-5 / AC-5: ATENDENTE recebe HTTP 403 ao tentar GET /api/salas/[id]", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/salas/room-123", {
        method: "GET",
      });

      const response = await getRoomById(request, { params: { id: "room-123" } });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
    });
  });
});
