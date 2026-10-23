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

        if (!user || !user.tenant || !user.tenant.active) {
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as "ATENDENTE" | "GERENTE" | "CLIENTE",
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ATENDENTE" | "GERENTE" | "CLIENTE";
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
};
