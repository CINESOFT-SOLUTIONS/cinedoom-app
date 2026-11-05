import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Ticket, ChevronRight, CreditCard, Banknote, QrCode } from "lucide-react";

interface CineDoomFooterProps {
  className?: string;
  simple?: boolean;
}

/**
 * Rodapé Oficial e Unificado do CineDoom
 * Refinado e padronizado: suporta versão completa em 4 colunas ou versão simplificada apenas com a barra inferior.
 */
export function CineDoomFooter({ className = "", simple = false }: CineDoomFooterProps) {
  if (simple) {
    return (
      <footer className={`bg-[#070A12] border-t border-white/10 py-6 text-xs text-slate-400 mt-16 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 CineDoom. Todos os direitos reservados.</p>
            <div className="flex items-center gap-2">
              <span>Tecnologia por</span>
              <div className="relative h-7 w-32 opacity-90 hover:opacity-100 transition-opacity">
                <Image
                  src="/logos/cinesoft-logo-horizontal-white.png"
                  alt="CineSoft Solutions"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`bg-[#070A12] border-t border-white/10 pt-14 pb-8 text-xs text-slate-400 mt-16 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Grid Principal de 4 Colunas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Coluna 1: Apresentação do Cinema */}
          <div className="space-y-4">
            <div className="relative h-10 w-44">
              <Image
                src="/logos/cinedoom-logo-horizontal-white.png"
                alt="CineDoom"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed text-justify [text-justify:inter-word] hyphens-auto">
              Cinema boutique com quatro salas, som imersivo, conforto em cada detalhe e reservas online sem taxa de conveniência.
            </p>
          </div>

          {/* Coluna 2: Programação & Navegação (Links Válidos) */}
          <div className="space-y-3">
            <span className="font-bold text-white text-xs uppercase tracking-wider block border-b border-white/10 pb-2">
              Programação & Cinema
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/"
                  className="hover:text-cta transition-colors flex items-center gap-1.5 text-slate-300"
                >
                  <ChevronRight className="w-3 h-3 text-cta shrink-0" />
                  <span>Filmes em Cartaz</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/sobre"
                  className="hover:text-cta transition-colors flex items-center gap-1.5 text-slate-300"
                >
                  <ChevronRight className="w-3 h-3 text-cta shrink-0" />
                  <span>Sobre o CineDoom</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/sobre#experiencias"
                  className="hover:text-cta transition-colors flex items-center gap-1.5 text-slate-300"
                >
                  <ChevronRight className="w-3 h-3 text-cta shrink-0" />
                  <span>Salas e Categorias</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/sobre#espacos"
                  className="hover:text-cta transition-colors flex items-center gap-1.5 text-slate-300"
                >
                  <ChevronRight className="w-3 h-3 text-cta shrink-0" />
                  <span>Espaços & Bomboniere</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Bilheteria & Reservas (Regras Operacionais Claras) */}
          <div className="space-y-3">
            <span className="font-bold text-white text-xs uppercase tracking-wider block border-b border-white/10 pb-2">
              Bilheteria & Reservas
            </span>
            <ul className="space-y-2 text-xs mb-3">
              <li>
                <Link
                  href="/portal/minhas-reservas"
                  className="hover:text-cta transition-colors flex items-center gap-1.5 text-slate-300 font-medium"
                >
                  <Ticket className="w-3.5 h-3.5 text-cta shrink-0" />
                  <span>Minhas Reservas Online</span>
                </Link>
              </li>
            </ul>

            <div className="space-y-1.5 text-xs text-slate-400 leading-relaxed text-justify [text-justify:inter-word] hyphens-auto">
              <p>
                <strong className="text-slate-300 font-semibold">Validade das reservas:</strong> os assentos selecionados pelo portal ficam garantidos até 1 hora antes do início da sessão.
              </p>
              <p className="text-[11px] text-slate-500 text-justify [text-justify:inter-word] hyphens-auto">
                O pagamento e a retirada dos ingressos são concluídos diretamente no balcão da bilheteria física.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Meia-Entrada
              </span>
              <p className="text-[11px] text-slate-500 leading-tight text-justify [text-justify:inter-word] hyphens-auto">
                Benefício concedido conforme a legislação vigente, mediante apresentação de documento comprobatório na bilheteria física.
              </p>
            </div>
          </div>

          {/* Coluna 4: Segurança & Pagamentos (Comunicação Prudente e Verificada) */}
          <div className="space-y-3.5">
            <span className="font-bold text-white text-xs uppercase tracking-wider block border-b border-white/10 pb-2">
              Segurança & Pagamentos
            </span>

            {/* Proteção de Dados e Integridade */}
            <div className="space-y-2 text-justify [text-justify:inter-word] hyphens-auto">
              <div className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-justify [text-justify:inter-word] hyphens-auto">Tratamento e proteção de dados pessoais em consonância com as diretrizes da LGPD.</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed text-justify [text-justify:inter-word] hyphens-auto">
                Seleção de assentos com prevenção de reservas duplicadas em tempo real.
              </p>
            </div>

            {/* Formas de Pagamento Aceitas no Balcão */}
            <div className="pt-1 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pagamento na Bilheteria Física
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-1.5 text-slate-300 font-medium">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>PIX</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-1.5 text-slate-300 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Cartões Crédito</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-1.5 text-slate-300 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Cartões Débito</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-1.5 text-slate-300 font-medium">
                  <Banknote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Dinheiro</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Linha Inferior: Direitos Autorais Padronizados & Crédito CineSoft Solutions */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 CineDoom. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2">
            <span>Tecnologia por</span>
            <div className="relative h-7 w-32 opacity-90 hover:opacity-100 transition-opacity">
              <Image
                src="/logos/cinesoft-logo-horizontal-white.png"
                alt="CineSoft Solutions"
                fill
                className="object-contain object-left"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
