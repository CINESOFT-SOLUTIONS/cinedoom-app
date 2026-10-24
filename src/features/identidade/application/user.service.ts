import { hashPassword } from "@/modules/auth/auth-service";
import type {
  IUserRepository,
  SafeUser,
} from "../domain/user-repository.interface";
import { defaultUserRepository } from "../infrastructure/prisma-user.repository";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "./user.schema";

export { SafeUser };

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

export class UserServiceClass {
  constructor(private userRepo: IUserRepository = defaultUserRepository) {}

  /**
   * Lista usuarios vinculados compulsoriamente ao tenantId do gerente logado.
   * Rastreabilidade: AC-5, US-6, TASK-13
   */
  async listUsers(tenantId: string, roleFilter?: string): Promise<SafeUser[]> {
    if (!tenantId) {
      throw new Error("Contexto de tenantId e obrigatorio.");
    }

    return this.userRepo.findMany(tenantId, roleFilter);
  }

  /**
   * Obtem usuario do tenant por ID. Lanca UserNotFoundError se nao pertencer ao tenant.
   */
  async getUserById(id: string, tenantId: string): Promise<SafeUser> {
    if (!id || !tenantId) {
      throw new Error("ID do usuario e tenantId sao obrigatorios.");
    }

    const user = await this.userRepo.findById(id, tenantId);
    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  }

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

    // Valida se ja existe usuario com o mesmo email no mesmo tenant
    const existingUser = await this.userRepo.findByEmail(normalizedEmail, tenantId);
    if (existingUser) {
      throw new EmailAlreadyInUseError();
    }

    // Criptografa a senha com bcrypt (custo 12)
    const passwordHash = await hashPassword(data.password);

    return this.userRepo.create({
      tenantId,
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "ATENDENTE",
      active: data.active ?? true,
    });
  }

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

    const existingUser = await this.userRepo.findById(id, tenantId);
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

    return this.userRepo.update(id, updateData);
  }

  /**
   * Inativa um operador (active = false).
   */
  async inactivateUser(id: string, tenantId: string, currentUserId: string): Promise<SafeUser> {
    return this.updateUser(id, tenantId, currentUserId, { active: false });
  }

  /**
   * Reativa um operador (active = true).
   */
  async activateUser(id: string, tenantId: string, currentUserId: string): Promise<SafeUser> {
    return this.updateUser(id, tenantId, currentUserId, { active: true });
  }
}

export const UserService = new UserServiceClass();
export const listUsers = UserService.listUsers.bind(UserService);
export const getUserById = UserService.getUserById.bind(UserService);
export const createAttendant = UserService.createAttendant.bind(UserService);
export const updateUser = UserService.updateUser.bind(UserService);
export const inactivateUser = UserService.inactivateUser.bind(UserService);
export const activateUser = UserService.activateUser.bind(UserService);
