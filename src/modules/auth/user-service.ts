import { rawPrisma } from "@/shared/db/prisma";
import { hashPassword } from "./auth-service";
import { CreateUserInput, UpdateUserInput } from "./user-schema";

export class UserNotFoundError extends Error {
  constructor(message = "Usuario nao encontrado no tenant informado.") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export class EmailAlreadyInUseError extends Error {
  constructor(message = "Ja existe um usuario cadastrado com este e-mail neste cinema.") {
    super(message);
    this.name = "EmailAlreadyInUseError";
  }
}

export class SelfInactivationError extends Error {
  constructor(message = "O gerente nao pode desativar sua propria conta de acesso.") {
    super(message);
    this.name = "SelfInactivationError";
  }
}

export class InvalidRoleAssignmentError extends Error {
  constructor(message = "Apenas usuarios com perfil ATENDENTE podem ser criados ou gerenciados nesta rota.") {
    super(message);
    this.name = "InvalidRoleAssignmentError";
  }
}

export interface SafeUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date | string;
  _count?: {
    ticketsSold: number;
  };
}

export const UserService = {
  /**
   * Lista usuarios vinculados compulsoriamente ao tenantId do gerente logado.
   * Rastreabilidade: AC-5, US-6, TASK-13
   */
  async listUsers(tenantId: string, roleFilter?: string): Promise<SafeUser[]> {
    if (!tenantId) {
      throw new Error("Contexto de tenantId e obrigatorio.");
    }

    const whereClause: {
      tenantId: string;
      role?: any;
    } = {
      tenantId,
    };

    if (roleFilter) {
      whereClause.role = roleFilter;
    }

    const users = await rawPrisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            ticketsSold: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users;
  },

  /**
   * Obtem usuario do tenant por ID. Lanca UserNotFoundError se nao pertencer ao tenant.
   */
  async getUserById(id: string, tenantId: string): Promise<SafeUser> {
    if (!id || !tenantId) {
      throw new Error("ID do usuario e tenantId sao obrigatorios.");
    }

    const user = await rawPrisma.user.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            ticketsSold: true,
          },
        },
      },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  },

  /**
   * Cadastra novo operador atendente com hash bcrypt (custo 12) associado ao tenant do gerente.
   */
  async createAttendant(data: CreateUserInput, tenantId: string): Promise<SafeUser> {
    if (!tenantId) {
      throw new Error("Contexto de tenantId e obrigatorio para criacao de operador.");
    }

    if (data.role && data.role !== "ATENDENTE") {
      throw new InvalidRoleAssignmentError();
    }

    const normalizedEmail = data.email.toLowerCase().trim();

    // Valida se ja existe usuario com o mesmo email no mesmo tenant (@@unique([tenantId, email]))
    const existingUser = await rawPrisma.user.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw new EmailAlreadyInUseError();
    }

    // Criptografa a senha com bcrypt (custo 12)
    const passwordHash = await hashPassword(data.password);

    const newUser = await rawPrisma.user.create({
      data: {
        tenantId,
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "ATENDENTE",
        active: data.active ?? true,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return newUser;
  },

  /**
   * Atualiza dados de operador (nome, status ativo/inativo, redefinicao de senha).
   * Impede auto-desativacao do gerente logado.
   */
  async updateUser(
    id: string,
    tenantId: string,
    currentUserId: string,
    data: UpdateUserInput
  ): Promise<SafeUser> {
    if (!id || !tenantId) {
      throw new Error("ID e tenantId sao obrigatorios.");
    }

    const existingUser = await rawPrisma.user.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existingUser) {
      throw new UserNotFoundError();
    }

    // Impede auto-desativacao do usuario atual
    if (data.active === false && (id === currentUserId || existingUser.id === currentUserId)) {
      throw new SelfInactivationError();
    }

    const updateData: {
      name?: string;
      active?: boolean;
      passwordHash?: string;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    const updatedUser = await rawPrisma.user.update({
      where: {
        id,
      },
      data: updateData,
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return updatedUser;
  },

  /**
   * Inativa um operador (active = false).
   */
  async inactivateUser(id: string, tenantId: string, currentUserId: string): Promise<SafeUser> {
    return this.updateUser(id, tenantId, currentUserId, { active: false });
  },

  /**
   * Reativa um operador (active = true).
   */
  async activateUser(id: string, tenantId: string, currentUserId: string): Promise<SafeUser> {
    return this.updateUser(id, tenantId, currentUserId, { active: true });
  },
};
