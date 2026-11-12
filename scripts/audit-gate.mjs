#!/usr/bin/env node
/**
 * Gate de auditoria de dependências de produção.
 *
 * Executa `pnpm audit --prod --json`, bloqueia vulnerabilidades altas/críticas
 * que não estejam no baseline documentado em security/audit-baseline.json e
 * imprime as exceções aceitas com a justificativa correspondente.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "security", "audit-baseline.json");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const accepted = baseline.advisories ?? {};
const blockingSeverities = new Set(["high", "critical"]);

let rawReport = "";
try {
  rawReport = execFileSync("pnpm", ["audit", "--prod", "--json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch (error) {
  rawReport = error.stdout?.toString?.() ?? "";
  if (!rawReport) {
    console.error("[audit] Falha ao executar pnpm audit.");
    process.exit(1);
  }
}

let report;
try {
  report = JSON.parse(rawReport);
} catch {
  console.error("[audit] Saída inválida do pnpm audit.");
  process.exit(1);
}

const advisories = Object.values(report.advisories ?? {});
const severe = advisories.filter((advisory) =>
  blockingSeverities.has(advisory.severity),
);
const isAccepted = (advisory) =>
  Boolean(accepted[advisory.github_advisory_id ?? advisory.ghsa_id]);
const tolerated = severe.filter(isAccepted);
const blocking = severe.filter((advisory) => !isAccepted(advisory));

console.log(
  `[audit] ${severe.length} vulnerabilidade(s) alta(s)/crítica(s): ` +
    `${tolerated.length} no baseline, ${blocking.length} bloqueante(s).`,
);

for (const advisory of tolerated) {
  const id = advisory.github_advisory_id ?? advisory.ghsa_id;
  console.log(
    `  ACEITA ${advisory.severity.toUpperCase()} ${id} (${advisory.module_name}): ${accepted[id].reason}`,
  );
}

if (blocking.length > 0) {
  console.error("\n[audit] Vulnerabilidades fora do baseline:");
  for (const advisory of blocking) {
    const id = advisory.github_advisory_id ?? advisory.ghsa_id;
    console.error(
      `  BLOQUEIA ${advisory.severity.toUpperCase()} ${id} (${advisory.module_name}): ${advisory.title}`,
    );
  }
  process.exit(1);
}

console.log("[audit] Nenhuma vulnerabilidade alta/crítica fora do baseline.");
