import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  hasRole,
  evaluateRouteAccess,
} from "@/modules/auth";

describe("Authentication & RBAC Control (AC-5 / TC-5 / TC-13 / TC-20)", () => {
  describe("Password Hashing (bcrypt / cost 12)", () => {
    it("deve gerar hash bcrypt valido e verificar com sucesso senha correta", async () => {
      const rawPassword = "SenhaSeguraCineDoom123";
      const hash = await hashPassword(rawPassword);

      expect(hash).toBeDefined();
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

      const isMatch = await verifyPassword(rawPassword, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await verifyPassword("SenhaInvalida456", hash);
      expect(isWrongMatch).toBe(false);
    });

    it("deve rejeitar senhas com menos de 6 caracteres", async () => {
      await expect(hashPassword("12345")).rejects.toThrow(
        "A senha deve possuir no minimo 6 caracteres."
      );
    });

    it("verifyPassword com hash ou senha vazia deve retornar false sem quebrar", async () => {
      expect(await verifyPassword("", "hash")).toBe(false);
      expect(await verifyPassword("senha", "")).toBe(false);
    });
  });

  describe("RBAC Route Access Policy (AC-5)", () => {
    it("TC-20: GERENTE autenticado deve ter acesso irrestrito as rotas de gerenciamento", () => {
      const routes = [
        "/backoffice/filmes",
        "/api/backoffice/filmes",
        "/admin/salas",
        "/admin/usuarios",
        "/gerente/ocupacao",
        "/api/gerente/relatorios",
      ];

      for (const route of routes) {
        const result = evaluateRouteAccess(route, "GERENTE");
        expect(result.allowed).toBe(true);
        expect(result.statusCode).toBe(200);
      }
    });

    it("TC-5: ATENDENTE recebe compulsoriamente HTTP 403 ao tentar rota de cadastro de filmes", () => {
      const result = evaluateRouteAccess("/backoffice/filmes", "ATENDENTE");
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.reason).toContain("AC-5 / TC-5 / TC-13");
    });

    it("TC-13: ATENDENTE recebe compulsoriamente HTTP 403 em rotas de salas, sessões e usuários", () => {
      const restrictedRoutes = [
        "/admin/salas",
        "/admin/sessoes",
        "/admin/usuarios",
        "/api/admin/usuarios",
        "/gerente/ocupacao",
      ];

      for (const route of restrictedRoutes) {
        const result = evaluateRouteAccess(route, "ATENDENTE");
        expect(result.allowed).toBe(false);
        expect(result.statusCode).toBe(403);
      }
    });

    it("ATENDENTE e GERENTE devem acessar rotas de bilheteria física", () => {
      const atendenteResult = evaluateRouteAccess("/bilheteria/venda", "ATENDENTE");
      expect(atendenteResult.allowed).toBe(true);
      expect(atendenteResult.statusCode).toBe(200);

      const gerenteResult = evaluateRouteAccess("/bilheteria/venda", "GERENTE");
      expect(gerenteResult.allowed).toBe(true);
      expect(gerenteResult.statusCode).toBe(200);
    });

    it("CLIENTE tentando acessar rotas de bilheteria ou gerencia recebe 403", () => {
      const backofficeRes = evaluateRouteAccess("/backoffice/filmes", "CLIENTE");
      expect(backofficeRes.allowed).toBe(false);
      expect(backofficeRes.statusCode).toBe(403);

      const bilheteriaRes = evaluateRouteAccess("/bilheteria/venda", "CLIENTE");
      expect(bilheteriaRes.allowed).toBe(false);
      expect(bilheteriaRes.statusCode).toBe(403);
    });

    it("permite ATENDENTE, GERENTE e CLIENTE no endpoint de polling de assentos (AC-2 / TC-17)", () => {
      const pollingPath = "/api/sessoes/sess-123/assentos";

      const atendenteRes = evaluateRouteAccess(pollingPath, "ATENDENTE");
      expect(atendenteRes.allowed).toBe(true);
      expect(atendenteRes.statusCode).toBe(200);

      const gerenteRes = evaluateRouteAccess(pollingPath, "GERENTE");
      expect(gerenteRes.allowed).toBe(true);
      expect(gerenteRes.statusCode).toBe(200);

      const clienteRes = evaluateRouteAccess(pollingPath, "CLIENTE");
      expect(clienteRes.allowed).toBe(true);
      expect(clienteRes.statusCode).toBe(200);

      const unauthRes = evaluateRouteAccess(pollingPath, undefined);
      expect(unauthRes.allowed).toBe(false);
      expect(unauthRes.statusCode).toBe(401);
    });

    it("requisicao desautenticada em rota protegida deve retornar HTTP 401", () => {
      const result = evaluateRouteAccess("/backoffice/filmes", undefined);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("rotas publicas do portal e raiz devem permitir acesso livre", () => {
      const publicRoutes = [
        "/",
        "/portal",
        "/portal/programacao",
        "/portal/cadastro",
        "/auth/login",
      ];

      for (const route of publicRoutes) {
        const result = evaluateRouteAccess(route, undefined);
        expect(result.allowed).toBe(true);
        expect(result.statusCode).toBe(200);
      }
    });
  });

  describe("Helper hasRole", () => {
    it("deve validar corretamente se a role do usuario pertence ao grupo permitido", () => {
      expect(hasRole("GERENTE", ["GERENTE", "ADMIN"])).toBe(true);
      expect(hasRole("ATENDENTE", ["GERENTE"])).toBe(false);
      expect(hasRole("ATENDENTE", ["ATENDENTE", "GERENTE"])).toBe(true);
    });
  });
});
