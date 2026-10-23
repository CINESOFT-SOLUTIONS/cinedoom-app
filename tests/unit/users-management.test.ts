import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { rawPrisma } from "@/shared/db/prisma";
import {
  UserService,
  createUserSchema,
  updateUserSchema,
  formatZodErrors,
  UserNotFoundError,
  EmailAlreadyInUseError,
  SelfInactivationError,
  InvalidRoleAssignmentError,
} from "@/modules/auth";
import { verifyPassword } from "@/modules/auth/auth-service";
import { GET as getUsuarios, POST as postUsuarios } from "@/app/api/backoffice/usuarios/route";
import {
  GET as getUsuarioById,
  PATCH as patchUsuario,
  DELETE as deleteUsuario,
} from "@/app/api/backoffice/usuarios/[id]/route";
import { authOptions } from "@/modules/auth/auth-options";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  rawPrisma: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  prisma: {},
}));

describe("Gestão de Atendentes pelo Gerente (AC-5 / US-6 / TASK-13)", () => {
  const tenantId = "11111111-1111-4111-a111-111111111111";
  const managerId = "00000000-0000-4000-a000-000000000001";
  const attendantId = "00000000-0000-4000-a000-000000000002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validação com Zod (createUserSchema & updateUserSchema)", () => {
    it("valida com sucesso payload correto de novo atendente", () => {
      const validPayload = {
        name: "Carlos Atendente",
        email: "carlos@cinema.com",
        password: "SenhaForte123!",
        role: "ATENDENTE",
      };

      const result = createUserSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Carlos Atendente");
        expect(result.data.email).toBe("carlos@cinema.com");
        expect(result.data.role).toBe("ATENDENTE");
        expect(result.data.active).toBe(true);
      }
    });

    it("rejeita senha com menos de 6 caracteres", () => {
      const invalidPayload = {
        name: "Carlos Atendente",
        email: "carlos@cinema.com",
        password: "123",
      };

      const result = createUserSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some((e) => e.field === "password")).toBe(true);
        expect(errors[0].message).toContain("minimo 6 caracteres");
      }
    });

    it("rejeita e-mail em formato inválido", () => {
      const invalidEmail = {
        name: "Carlos Atendente",
        email: "carlos-sem-arroba",
        password: "SenhaValida123",
      };

      const result = createUserSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some((e) => e.field === "email")).toBe(true);
      }
    });

    it("rejeita compulsoriamente a criação de usuário com role GERENTE (FRAME-7)", () => {
      const gerentePayload = {
        name: "Tentativa de Gerente",
        email: "gerente2@cinema.com",
        password: "SenhaValida123",
        role: "GERENTE",
      };

      const result = createUserSchema.safeParse(gerentePayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some((e) => e.field === "role")).toBe(true);
        expect(errors[0].message).toContain("Apenas contas de perfil ATENDENTE");
      }
    });

    it("updateUserSchema permite atualização parcial (apenas active ou apenas senha)", () => {
      const updateStatusOnly = { active: false };
      expect(updateUserSchema.safeParse(updateStatusOnly).success).toBe(true);

      const updatePasswordOnly = { password: "NovaSenhaValida456" };
      expect(updateUserSchema.safeParse(updatePasswordOnly).success).toBe(true);
    });
  });

  describe("UserService (Camada de Domínio & Multi-Tenancy)", () => {
    it("listUsers busca exclusivamente usuários pertencentes ao tenant do gerente logado", async () => {
      const mockUsers = [
        {
          id: attendantId,
          tenantId,
          name: "Operador 1",
          email: "op1@cinema.com",
          role: "ATENDENTE",
          active: true,
          createdAt: new Date(),
          _count: { ticketsSold: 5 },
        },
      ];

      vi.mocked(rawPrisma.user.findMany).mockResolvedValue(mockUsers as any);

      const result = await UserService.listUsers(tenantId);

      expect(rawPrisma.user.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        select: expect.objectContaining({
          id: true,
          tenantId: true,
          name: true,
          email: true,
          role: true,
          active: true,
        }),
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("op1@cinema.com");
    });

    it("createAttendant cria operador com senha em hash bcrypt custo 12 e tenant associado", async () => {
      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue(null);

      const mockCreated = {
        id: attendantId,
        tenantId,
        name: "Ana Operadora",
        email: "ana@cinema.com",
        role: "ATENDENTE",
        active: true,
        createdAt: new Date(),
      };

      vi.mocked(rawPrisma.user.create).mockResolvedValue(mockCreated as any);

      const input = {
        name: "Ana Operadora",
        email: "ana@cinema.com",
        password: "SegredoForte123",
        role: "ATENDENTE" as const,
        active: true,
      };

      const user = await UserService.createAttendant(input, tenantId);

      expect(user.id).toBe(attendantId);
      expect(rawPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: "Ana Operadora",
          email: "ana@cinema.com",
          role: "ATENDENTE",
          active: true,
          passwordHash: expect.stringMatching(/^\$2[ab]\$12\$/),
        }),
        select: expect.anything(),
      });

      // Valida que o hash gerado confere com a senha informada
      const createCall = vi.mocked(rawPrisma.user.create).mock.calls[0][0];
      const isValid = await verifyPassword("SegredoForte123", (createCall.data as any).passwordHash);
      expect(isValid).toBe(true);
    });

    it("createAttendant lança EmailAlreadyInUseError se já existir email no mesmo tenant", async () => {
      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue({
        id: "existing-id",
        email: "ana@cinema.com",
        tenantId,
      } as any);

      const input = {
        name: "Ana Duplicada",
        email: "ana@cinema.com",
        password: "SegredoForte123",
        role: "ATENDENTE" as const,
        active: true,
      };

      await expect(UserService.createAttendant(input, tenantId)).rejects.toThrow(
        EmailAlreadyInUseError
      );
      expect(rawPrisma.user.create).not.toHaveBeenCalled();
    });

    it("getUserById lança UserNotFoundError se o usuário pertencer a outro tenant", async () => {
      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue(null);

      await expect(UserService.getUserById("user-de-outro-cinema", tenantId)).rejects.toThrow(
        UserNotFoundError
      );
    });

    it("updateUser impede auto-desativação do gerente logado (SelfInactivationError)", async () => {
      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue({
        id: managerId,
        tenantId,
        role: "GERENTE",
      } as any);

      await expect(
        UserService.updateUser(managerId, tenantId, managerId, { active: false })
      ).rejects.toThrow(SelfInactivationError);

      expect(rawPrisma.user.update).not.toHaveBeenCalled();
    });

    it("inactivateUser inativa com sucesso um operador atendente", async () => {
      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue({
        id: attendantId,
        tenantId,
        role: "ATENDENTE",
        active: true,
      } as any);

      vi.mocked(rawPrisma.user.update).mockResolvedValue({
        id: attendantId,
        tenantId,
        name: "Operador",
        email: "op@cinema.com",
        role: "ATENDENTE",
        active: false,
        createdAt: new Date(),
      } as any);

      const updated = await UserService.inactivateUser(attendantId, tenantId, managerId);
      expect(updated.active).toBe(false);
      expect(rawPrisma.user.update).toHaveBeenCalledWith({
        where: { id: attendantId },
        data: { active: false },
        select: expect.anything(),
      });
    });
  });

  describe("Route Handlers /api/backoffice/usuarios (RBAC & Status HTTP)", () => {
    it("AC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar GET /api/backoffice/usuarios", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: attendantId, role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/backoffice/usuarios", {
        method: "GET",
      });

      const response = await getUsuarios(request);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain("Acesso negado");
      expect(rawPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it("AC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar POST /api/backoffice/usuarios", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: attendantId, role: "ATENDENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/backoffice/usuarios", {
        method: "POST",
        body: JSON.stringify({
          name: "Novo Atendente",
          email: "novo@cinema.com",
          password: "SenhaValida123",
        }),
      });

      const response = await postUsuarios(request);
      expect(response.status).toBe(403);
      expect(rawPrisma.user.create).not.toHaveBeenCalled();
    });

    it("GERENTE recebe HTTP 201 Created ao cadastrar atendente com dados válidos", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(rawPrisma.user.create).mockResolvedValue({
        id: attendantId,
        tenantId,
        name: "Novo Operador",
        email: "operador@cinema.com",
        role: "ATENDENTE",
        active: true,
        createdAt: new Date(),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/backoffice/usuarios", {
        method: "POST",
        body: JSON.stringify({
          name: "Novo Operador",
          email: "operador@cinema.com",
          password: "SenhaValida123",
          role: "ATENDENTE",
        }),
      });

      const response = await postUsuarios(request);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.name).toBe("Novo Operador");
      expect(json.role).toBe("ATENDENTE");
    });

    it("POST /api/backoffice/usuarios retorna 422 ao tentar cadastrar perfil GERENTE", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/backoffice/usuarios", {
        method: "POST",
        body: JSON.stringify({
          name: "Gerente Substituto",
          email: "gerente2@cinema.com",
          password: "SenhaValida123",
          role: "GERENTE",
        }),
      });

      const response = await postUsuarios(request);
      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.errors.some((e: any) => e.field === "role")).toBe(true);
    });

    it("POST /api/backoffice/usuarios retorna 409 ao cadastrar e-mail duplicado", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue({
        id: "existing-user",
        email: "operador@cinema.com",
        tenantId,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/backoffice/usuarios", {
        method: "POST",
        body: JSON.stringify({
          name: "Novo Operador",
          email: "operador@cinema.com",
          password: "SenhaValida123",
        }),
      });

      const response = await postUsuarios(request);
      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error).toContain("Ja existe um usuario cadastrado");
    });

    it("PATCH /api/backoffice/usuarios/[id] retorna 400 se o gerente tentar auto-desativação", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue({
        id: managerId,
        tenantId,
        role: "GERENTE",
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/backoffice/usuarios/${managerId}`, {
        method: "PATCH",
        body: JSON.stringify({ active: false }),
      });

      const response = await patchUsuario(request, { params: { id: managerId } });
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("nao pode desativar sua propria conta");
    });

    it("PATCH /api/backoffice/usuarios/[id] retorna 404 para usuário de outro tenant", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/backoffice/usuarios/cross-tenant-id", {
        method: "PATCH",
        body: JSON.stringify({ active: false }),
      });

      const response = await patchUsuario(request, { params: { id: "cross-tenant-id" } });
      expect(response.status).toBe(404);
    });

    it("DELETE /api/backoffice/usuarios/[id] inativa operador com sucesso", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: managerId, role: "GERENTE", tenantId },
      } as any);

      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue({
        id: attendantId,
        tenantId,
        role: "ATENDENTE",
        active: true,
      } as any);

      vi.mocked(rawPrisma.user.update).mockResolvedValue({
        id: attendantId,
        tenantId,
        role: "ATENDENTE",
        active: false,
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/backoffice/usuarios/${attendantId}`, {
        method: "DELETE",
      });

      const response = await deleteUsuario(request, { params: { id: attendantId } });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toContain("inativado com sucesso");
    });
  });

  describe("Critério de Aceite: Operador Inativado Perde Acesso Imediatamente", () => {
    it("NextAuth authorize rejeita credenciais de operador inativo (active = false)", async () => {
      vi.mocked(rawPrisma.user.findFirst).mockResolvedValue(null); // findFirst filtra { active: true }

      const credentialsProvider = authOptions.providers.find(
        (p: any) => p.id === "credentials"
      );

      expect(credentialsProvider).toBeDefined();

      const user = await (credentialsProvider as any).authorize(
        {
          email: "inativo@cinema.com",
          password: "SenhaValida123",
        },
        {} as any
      );

      expect(user).toBeNull();
    });
  });
});
