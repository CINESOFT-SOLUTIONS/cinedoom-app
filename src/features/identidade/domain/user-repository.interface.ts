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

export interface CreateUserData {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
}

export interface UpdateUserData {
  name?: string;
  active?: boolean;
  passwordHash?: string;
}

export interface IUserRepository {
  findMany(tenantId: string, roleFilter?: string): Promise<SafeUser[]>;
  findById(id: string, tenantId: string): Promise<SafeUser | null>;
  findByEmail(email: string, tenantId: string): Promise<{ id: string; email: string } | null>;
  create(data: CreateUserData): Promise<SafeUser>;
  update(id: string, data: UpdateUserData): Promise<SafeUser>;
}
