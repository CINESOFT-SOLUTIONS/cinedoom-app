import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { rawPrisma } from "@/shared/db/prisma";
import { verifyPassword } from "./auth-service";
import "./auth-types";

const LEGACY_GENERIC_NAMES = new Set([
  "gerente geral cinedoom",
  "gerente cinedoom",
  "gerente",
  "atendente bilheteria",
  "atendente cinedoom",
  "atendente",
  "cliente cinedoom",
  "cliente",
]);

function resolveCanonicalUserName(
  name?: string | null,
  role?: string | null,
  email?: string | null
): string {
  const trimmed = (name || "").trim();
  if (trimmed && !LEGACY_GENERIC_NAMES.has(trimmed.toLowerCase())) {
    return trimmed;
  }
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (role === "GERENTE" || normalizedEmail === "gerente@cinedoom.com") {
    return "Eduardo Vasconcelos";
  }
  if (role === "ATENDENTE" || normalizedEmail === "atendente@cinedoom.com") {
    return "Camila Ribeiro";
  }
  return "Lucas Mendes";
}

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
                name: resolveCanonicalUserName(user.name, user.role, user.email),
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
              name: "Eduardo Vasconcelos",
              email: "gerente@cinedoom.com",
              role: "GERENTE",
              tenantId: "11111111-1111-4111-a111-111111111111",
              active: true,
            };
          }
          if (normalizedEmail === "atendente@cinedoom.com") {
            return {
              id: "00000000-0000-4000-a000-000000000002",
              name: "Camila Ribeiro",
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
        token.name = resolveCanonicalUserName(user.name, user.role, user.email);
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.active = user.active ?? true;
      }

      // Revalida se o usuario continua ativo (DoD: Operador inativado perde acesso imediatamente)
      if (token?.id) {
        try {
          const dbUser = await rawPrisma.user.findUnique({
            where: { id: token.id as string },
            select: { active: true, role: true, name: true, email: true },
          });

          if (dbUser) {
            token.active = dbUser.active;
            token.role = dbUser.role as "ATENDENTE" | "GERENTE" | "CLIENTE";
            token.name = resolveCanonicalUserName(dbUser.name, dbUser.role, dbUser.email);
          }
        } catch {
          // Mantem o token caso a conexao direta falhe em mock
        }
      }

      token.name = resolveCanonicalUserName(
        token.name as string | undefined,
        token.role as string | undefined,
        token.email as string | undefined
      );

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ATENDENTE" | "GERENTE" | "CLIENTE";
        session.user.tenantId = token.tenantId as string;
        session.user.active = token.active !== false;
        session.user.name = resolveCanonicalUserName(
          (token.name as string) || session.user.name,
          session.user.role,
          session.user.email
        );
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Permite redirecionamento relativo (ex: /portal, /gestao) sem forçar http://localhost:3000
      if (url.startsWith("/")) return url;
      try {
        const urlObj = new URL(url);
        const baseObj = new URL(baseUrl);
        if (urlObj.origin === baseObj.origin) return url;
        // Permite hosts de rede local (LAN / Wi-Fi)
        if (
          urlObj.hostname === "localhost" ||
          urlObj.hostname.startsWith("192.168.") ||
          urlObj.hostname.startsWith("10.") ||
          urlObj.hostname.startsWith("172.")
        ) {
          return url;
        }
      } catch {
        // fallback
      }
      return baseUrl;
    },
  },
};
