# CineDoom App

[![CI Pipeline](https://github.com/CINESOFT-SOLUTIONS/cinedoom-app/actions/workflows/ci.yml/badge.svg)](https://github.com/CINESOFT-SOLUTIONS/cinedoom-app/actions/workflows/ci.yml)

Sistema SaaS multi-tenant para gestao e operacao de cinemas de rua e circuitos independentes, com isolamento logico rigoroso, conformidade com a LGPD (Art. 18 / R-CMP-7), persistencia ACID anti-double-booking e observabilidade de auditoria retida por 365 dias (ADR-011).

---

## Stack Tecnologica

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript 5 (Strict Mode)
- **Estilizacao:** Tailwind CSS
- **ORM & Banco:** Prisma ORM com PostgreSQL gerenciado no Supabase
- **Autenticacao:** NextAuth.js com RBAC (GERENTE, ATENDENTE, CLIENTE) e isolamento multi-tenant
- **Criptografia:** AES-256-GCM (PII de compradores) e HMAC-SHA256 (blind index para busca exata)
- **Testes:** Vitest com gate de cobertura nas regras de dominio
- **CI/CD:** GitHub Actions com deploy automatico de Preview na Vercel e banco PostgreSQL no Supabase
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

# Suite com relatorio e gate de cobertura
pnpm test:coverage

# Auditoria de dependencias com baseline documentado
pnpm security:audit

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
5. Execucao de 100% dos testes com Vitest e gate de cobertura (`pnpm vitest run --coverage`)
6. Auditoria de dependencias de producao com baseline justificado (`pnpm security:audit`)
7. Compilacao completa de build de producao Next.js (`pnpm build`)

O gate de cobertura mede as regras de dominio e os utilitarios compartilhados (`src/modules/**` e `src/shared/**`), com minimo de 70% de statements/funcoes/linhas e 80% de branches. Excecoes de auditoria de seguranca ficam em `security/audit-baseline.json` e sao revisadas a cada release.

---

## Ambientes de Preview e Banco de Dados

Conforme definido na **ADR-005**:
- Cada Pull Request gera um ambiente de preview isolado e temporario na Vercel.
- O banco de producao e um PostgreSQL gerenciado no Supabase. Ambientes de preview devem usar credenciais e dados proprios, sem reutilizar a conexao de producao.
- Apos o merge ou encerramento do PR, os recursos efemeros sao automaticamente destruidos.
