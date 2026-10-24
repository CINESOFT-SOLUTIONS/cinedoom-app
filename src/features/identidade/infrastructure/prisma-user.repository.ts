import { rawPrisma } from "@/shared/db/prisma";
import type {
  IUserRepository,
  SafeUser,
  CreateUserData,
  UpdateUserData,
} from "../domain/user-repository.interface";

export class PrismaUserRepository implements IUserRepository {
  async findMany(tenantId: string, roleFilter?: string): Promise<SafeUser[]> {
    const whereClause: {
      tenantId: string;
      role?: any;
    } = {
      tenantId,
    };

    if (roleFilter) {
      whereClause.role = roleFilter;
    }

    return rawPrisma.user.findMany({
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
  }

  async findById(id: string, tenantId: string): Promise<SafeUser | null> {
    return rawPrisma.user.findFirst({
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
  }

  async findByEmail(email: string, tenantId: string): Promise<{ id: string; email: string } | null> {
    return rawPrisma.user.findFirst({
      where: {
        tenantId,
        email,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  async create(data: CreateUserData): Promise<SafeUser> {
    return rawPrisma.user.create({
      data: data as any,
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
  }

  async update(id: string, data: UpdateUserData): Promise<SafeUser> {
    return rawPrisma.user.update({
      where: { id },
      data,
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
  }
}

export const defaultUserRepository = new PrismaUserRepository();
