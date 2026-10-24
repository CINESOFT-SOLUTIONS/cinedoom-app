# ----------------------------------------------------
# Base: Node.js 20 Alpine + pnpm
# ----------------------------------------------------
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat openssl

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

# ----------------------------------------------------
# Stage: Dependencies
# ----------------------------------------------------
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate

# ----------------------------------------------------
# Stage: Development (Suporte a Hot-Reload para Refatoracao)
# ----------------------------------------------------
FROM base AS dev
WORKDIR /app

ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]

# ----------------------------------------------------
# Stage: Builder (Compilacao Standalone de Producao)
# ----------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cinedoom?sslmode=disable"
ENV NEXTAUTH_SECRET="build-secret-key-at-least-32-chars-long"

RUN mkdir -p .next/standalone/.next
RUN pnpm build

# ----------------------------------------------------
# Stage: Runner (Producao Standalone Otimizada)
# ----------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
