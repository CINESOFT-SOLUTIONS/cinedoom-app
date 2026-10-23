# CineDoom App

[![CI Pipeline](https://github.com/CINESOFT-SOLUTIONS/cinedoom-app/actions/workflows/ci.yml/badge.svg)](https://github.com/CINESOFT-SOLUTIONS/cinedoom-app/actions/workflows/ci.yml)

Sistema SaaS multi-tenant para gestao e operacao de cinemas de rua e circuitos independentes, com isolamento logico rigoroso, conformidade com a LGPD (Art. 18 / R-CMP-7), persistencia ACID anti-double-booking e observabilidade de auditoria retida por 365 dias (ADR-011).

---

## Stack Tecnologica

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript 5 (Strict Mode)
- **Estilizacao:** Tailwind CSS
- **ORM & Banco:** Prisma ORM com PostgreSQL (Neon Serverless)
- **Autenticacao:** NextAuth.js com RBAC (ADMIN, GERENTE, ATENDENTE) e isolamento multi-tenant
- **Criptografia:** AES-256-GCM (PII de compradores) e HMAC-SHA256 (blind index para busca exata)
- **Testes:** Vitest
- **CI/CD:** GitHub Actions com deploy automatico de Preview na Vercel e Neon DB Branching
- **Observabilidade:** Structured JSON Logger compativel com Vercel Log Drain e ingestao Axiom

---

## Scripts Disponiveis

```bash
# Desenvolvimento local
pnpm dev

# Validacao de tipos TypeScript
pnpm typecheck

# Analise estatica e deteccao de dependencias circulares (ESLint import/no-cycle)
pnpm lint
pnpm eslint

# Execucao da suite de testes unitarios
pnpm test

# Modo assistido de testes
pnpm test:watch

# Compilacao e build de producao
pnpm build

# Inicializacao em producao
pnpm start
```

---

## Pipeline de Integracao Continua (CI/CD)

O pipeline automatizado via GitHub Actions (`.github/workflows/ci.yml`) e disparado em qualquer push ou pull request para os ramos `main` e `develop`.

O workflow valida estritamente em menos de 2 minutos:
1. Instalacao reproduzivel de dependencias via `pnpm install --frozen-lockfile`
2. Geracao automatica dos tipos de modelo Prisma (`pnpm prisma generate`)
3. Checagem estrita de tipos TypeScript (`pnpm tsc --noEmit`)
4. Analise estatica ESLint com bloqueio de ciclos de importacao (`pnpm eslint` com `import/no-cycle`)
5. Execucao de 100% dos testes unitarios com Vitest (`pnpm test`)
6. Compilacao completa de build de producao Next.js (`pnpm build`)

---

## Ambientes de Preview e Neon Database Branching

Conforme definido na **ADR-005**:
- Cada Pull Request gera um ambiente de preview isolado e temporario na Vercel.
- O banco de dados PostgreSQL utiliza o recurso de Branching do Neon Serverless, criando uma copia isolada para o PR com dados reais sem impactar o ambiente produtivo.
- Apos o merge ou encerramento do PR, os recursos efemeros sao automaticamente destruidos.
