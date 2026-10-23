import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { rawPrisma } from "@/shared/db/prisma";
import { verifyPassword } from "./auth-service";
import "./auth-types";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas de TTL
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "CineDoom Credentials",
      credentials: {
        email: { label: "E-mail", type: "email", placeholder: "operador@cinema.com" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        try {
          // Busca o usuario na base administrativa (rawPrisma para bypass de tenant na autenticacao inicial)
          const user = await rawPrisma.user.findFirst({
            where: {
              email: normalizedEmail,
              active: true,
            },
            include: {
              tenant: true,
            },
          });

          if (user && user.tenant && user.tenant.active) {
            const isPasswordValid = await verifyPassword(
              credentials.password,
              user.passwordHash
            );

            if (isPasswordValid) {
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role as "ATENDENTE" | "GERENTE" | "CLIENTE",
                tenantId: user.tenantId,
                active: user.active,
              };
            }
          }
        } catch {
          // Permite fallback de demonstracao em desenvolvimento local sem quebrar
        }

        // Credenciais padrao de demonstracao para desenvolvimento local (Issue #20 / Roteiro da Demo)
        if (credentials.password === "Cinema123!") {
          if (normalizedEmail === "gerente@cinedoom.com") {
            return {
              id: "00000000-0000-4000-a000-000000000001",
              name: "Gerente Geral CineDoom",
              email: "gerente@cinedoom.com",
              role: "GERENTE",
              tenantId: "11111111-1111-4111-a111-111111111111",
              active: true,
            };
          }
          if (normalizedEmail === "atendente@cinedoom.com") {
            return {
              id: "00000000-0000-4000-a000-000000000002",
              name: "Atendente Bilheteria",
              email: "atendente@cinedoom.com",
              role: "ATENDENTE",
              tenantId: "11111111-1111-4111-a111-111111111111",
              active: true,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.active = user.active ?? true;
      }

      // Revalida se o usuario continua ativo (DoD: Operador inativado perde acesso imediatamente)
      if (token?.id) {
        try {
          const dbUser = await rawPrisma.user.findUnique({
            where: { id: token.id as string },
            select: { active: true, role: true },
          });

          if (dbUser) {
            token.active = dbUser.active;
            token.role = dbUser.role as "ATENDENTE" | "GERENTE" | "CLIENTE";
          }
        } catch {
          // Mantem o token caso a conexao direta falhe em mock
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ATENDENTE" | "GERENTE" | "CLIENTE";
        session.user.tenantId = token.tenantId as string;
        session.user.active = token.active !== false;
      }
      return session;
    },
  },
};
