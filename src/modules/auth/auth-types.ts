import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: "ATENDENTE" | "GERENTE" | "CLIENTE";
      active?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    tenantId: string;
    role: "ATENDENTE" | "GERENTE" | "CLIENTE";
    active?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string;
    role: "ATENDENTE" | "GERENTE" | "CLIENTE";
    active?: boolean;
  }
}
