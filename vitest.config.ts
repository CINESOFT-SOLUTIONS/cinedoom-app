import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      // O gate de qualidade do manual mede as regras de domínio e os
      // utilitários compartilhados, não as páginas de UI do App Router.
      include: ["src/modules/**/*.ts", "src/shared/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/*.test.ts", "src/**/*.test.tsx"],
      thresholds: {
        statements: 70,
        branches: 80,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
