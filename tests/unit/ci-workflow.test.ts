import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("CI/CD Pipeline & Tooling Configuration (TASK-16 / Issue #17 / ADR-005)", () => {
  const rootDir = path.resolve(__dirname, "../../");
  const ciWorkflowPath = path.join(rootDir, ".github/workflows/ci.yml");
  const vercelJsonPath = path.join(rootDir, "vercel.json");
  const eslintrcPath = path.join(rootDir, ".eslintrc.json");
  const packageJsonPath = path.join(rootDir, "package.json");
  const readmePath = path.join(rootDir, "README.md");

  it("deve conter o arquivo de workflow .github/workflows/ci.yml legivel e estruturado", () => {
    expect(fs.existsSync(ciWorkflowPath)).toBe(true);
    const content = fs.readFileSync(ciWorkflowPath, "utf-8");
    expect(content.length).toBeGreaterThan(100);
    expect(content).toContain("name: CI Pipeline");
  });

  it("deve disparar em push e pull_request para os ramos main e develop", () => {
    const content = fs.readFileSync(ciWorkflowPath, "utf-8");
    expect(content).toContain("push:");
    expect(content).toContain("pull_request:");
    expect(content).toContain("main");
    expect(content).toContain("develop");
  });

  it("deve configurar controle de concorrencia cancel-in-progress para execucoes rapidas (< 2min)", () => {
    const content = fs.readFileSync(ciWorkflowPath, "utf-8");
    expect(content).toContain("concurrency:");
    expect(content).toContain("cancel-in-progress: true");
  });

  it("deve configurar Node.js 20, pnpm 9 com cache para performance otimizada", () => {
    const content = fs.readFileSync(ciWorkflowPath, "utf-8");
    expect(content).toContain("actions/setup-node@v4");
    expect(content).toContain("node-version: 20");
    expect(content).toContain('cache: "pnpm"');
    expect(content).toContain("pnpm/action-setup@v4");
    expect(content).toContain("version: 9");
  });

  it("deve conter todas as etapas essenciais de validacao de qualidade e compilacao", () => {
    const content = fs.readFileSync(ciWorkflowPath, "utf-8");
    expect(content).toContain("pnpm install --frozen-lockfile");
    expect(content).toContain("pnpm prisma generate");
    expect(content).toContain("pnpm tsc --noEmit");
    expect(content).toContain("pnpm eslint");
    expect(content).toContain("pnpm test");
    expect(content).toContain("pnpm build");
  });

  it("deve conter variaveis de ambiente de CI isoladas para execucao deterministica", () => {
    const content = fs.readFileSync(ciWorkflowPath, "utf-8");
    expect(content).toContain("DATABASE_URL:");
    expect(content).toContain("NEXTAUTH_SECRET:");
    expect(content).toContain("CINEDOOM_CPF_KEY:");
    expect(content).toContain("CINEDOOM_CPF_HMAC_KEY:");
  });

  it("deve ter regra import/no-cycle configurada com severidade error no .eslintrc.json", () => {
    expect(fs.existsSync(eslintrcPath)).toBe(true);
    const eslintrc = JSON.parse(fs.readFileSync(eslintrcPath, "utf-8"));
    expect(eslintrc.plugins).toContain("import");
    expect(eslintrc.rules["import/no-cycle"]).toBeDefined();
    const noCycleRule = eslintrc.rules["import/no-cycle"];
    const severity = Array.isArray(noCycleRule) ? noCycleRule[0] : noCycleRule;
    expect(severity).toBe("error");
  });

  it("deve conter arquivo vercel.json configurado para build com Prisma generate", () => {
    expect(fs.existsSync(vercelJsonPath)).toBe(true);
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));
    expect(vercelConfig.framework).toBe("nextjs");
    expect(vercelConfig.buildCommand).toContain("pnpm prisma generate");
    expect(vercelConfig.buildCommand).toContain("pnpm build");
    expect(vercelConfig.installCommand).toBe("pnpm install");
  });

  it("deve expor scripts padronizados de lint e eslint no package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    expect(pkg.scripts.lint).toBe("next lint");
    expect(pkg.scripts.eslint).toBe("next lint");
    expect(pkg.scripts.typecheck).toBe("tsc --noEmit");
    expect(pkg.scripts.test).toBe("vitest run");
  });

  it("deve conter o badge de status do GitHub Actions CI no README.md", () => {
    expect(fs.existsSync(readmePath)).toBe(true);
    const readmeContent = fs.readFileSync(readmePath, "utf-8");
    expect(readmeContent).toContain("actions/workflows/ci.yml/badge.svg");
    expect(readmeContent).toContain("actions/workflows/ci.yml");
  });
});
