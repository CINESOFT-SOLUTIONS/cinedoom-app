import { describe, it, expect } from "vitest";
import React from "react";
import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { CineDoomFooter } from "@/components/cinedoom-footer";

describe("Padronização e Refinamento do Rodapé Global do CineDoom", () => {
  it("renderiza o rodapé com textos refinados, marca CineDoom padronizada e comunicação prudente", () => {
    const html = renderToStaticMarkup(React.createElement(CineDoomFooter));

    // Identidade visual, fundo e estrutura
    expect(html).toContain("bg-[#070A12]");
    expect(html).toContain("border-white/10");
    expect(html).toContain("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");

    // 1. Apresentação do Cinema & Experiências Reais
    expect(html).toContain("Cinema boutique com quatro salas, som imersivo, conforto em cada detalhe e reservas online sem taxa de conveniência.");
    expect(html).toContain("Clássica (Salas 1 e 2)");
    expect(html).toContain("IMAX (Sala 3)");
    expect(html).toContain("VIP (Sala 4)");

    // 2. Programação e Navegação
    expect(html).toContain("Filmes em Cartaz");
    expect(html).toContain("Sobre o CineDoom");
    expect(html).toContain("Salas e Categorias");
    expect(html).toContain("Espaços &amp; Bomboniere");
    expect(html).toContain("Acesso Gestão &amp; Backoffice");

    // 3. Bilheteria e Regras Operacionais Verificadas
    expect(html).toContain("Minhas Reservas Online");
    expect(html).toContain("Validade das reservas");
    expect(html).toContain("garantidos até 1 hora antes do início da sessão");
    expect(html).toContain("Meia-Entrada");
    expect(html).toContain("Benefício concedido conforme a legislação vigente, mediante apresentação de documento comprobatório na bilheteria física.");

    // 4. Segurança, LGPD Prudente e Formas de Pagamento
    expect(html).toContain("Tratamento e proteção de dados pessoais em consonância com as diretrizes da LGPD.");
    expect(html).toContain("Seleção de assentos com prevenção de reservas duplicadas em tempo real.");
    expect(html).toContain("Pagamento na Bilheteria Física");
    expect(html).toContain("PIX");
    expect(html).toContain("Cartões Crédito");
    expect(html).toContain("Cartões Débito");
    expect(html).toContain("Dinheiro");

    // 5. Padronização da Marca e Crédito CineSoft Solutions
    expect(html).toContain("© 2026 CineDoom. Todos os direitos reservados.");
    expect(html).not.toContain("CineDoom Cinema. Todos os direitos reservados.");
    expect(html).toContain("Tecnologia por");
    expect(html).toContain("cinesoft-logo-horizontal-white.png");
  });

  it("permite customização de classes adicionais através da prop className", () => {
    const html = renderToStaticMarkup(React.createElement(CineDoomFooter, { className: "custom-footer-test" }));
    expect(html).toContain("custom-footer-test");
    expect(html).toContain("bg-[#070A12]");
  });

  it("garante que todas as páginas aplicáveis utilizam o componente compartilhado CineDoomFooter sem duplicações inline", () => {
    const appDir = path.resolve(__dirname, "../../src/app");

    // 1. Página Sobre o CineDoom
    const sobreContent = fs.readFileSync(path.join(appDir, "sobre/page.tsx"), "utf-8");
    expect(sobreContent).toContain("<CineDoomFooter");
    expect(sobreContent).not.toMatch(/<footer\b/);
    expect(sobreContent).toContain('id="espacos"');
    expect(sobreContent).toContain('id="experiencias"');

    // 2. Página Home / Catálogo Principal
    const homeContent = fs.readFileSync(path.join(appDir, "page.tsx"), "utf-8");
    expect(homeContent).toContain("<CineDoomFooter");
    expect(homeContent).not.toMatch(/<footer\b/);

    // 3. Página Minhas Reservas
    const minhasReservasContent = fs.readFileSync(path.join(appDir, "portal/minhas-reservas/page.tsx"), "utf-8");
    expect(minhasReservasContent).toContain("<CineDoomFooter");
    expect(minhasReservasContent).not.toMatch(/<footer\b/);

    // 4. Página de Seleção de Assentos
    const sessoesContent = fs.readFileSync(path.join(appDir, "portal/sessoes/[id]/page.tsx"), "utf-8");
    expect(sessoesContent).toContain("<CineDoomFooter");
    expect(sessoesContent).not.toMatch(/<footer\b/);

    // 5. Página de Comprovante de Reserva
    const comprovanteContent = fs.readFileSync(path.join(appDir, "portal/reservas/[id]/comprovante/page.tsx"), "utf-8");
    expect(comprovanteContent).toContain("<CineDoomFooter");
    expect(comprovanteContent).not.toMatch(/<footer\b/);
  });
});
