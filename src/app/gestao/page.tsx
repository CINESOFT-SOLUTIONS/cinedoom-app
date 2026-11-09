"use client";

import Link from "next/link";
import { Film, DoorOpen, Calendar, Users, ArrowRight } from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";

export default function GestãoDashboardPage() {
  const modules = [
    {
      title: "Sessões",
      description: "Agendamento, edição e gerenciamento da programação semanal de sessões.",
      href: "/gestao/sessoes",
      icon: Calendar,
      badge: "Programação",
    },
    {
      title: "Filmes",
      description: "Cadastro de obras cinematográficas, classificação indicativa, pôsteres e sinopses.",
      href: "/gestao/filmes",
      icon: Film,
      badge: "Catálogo",
    },
    {
      title: "Salas",
      description: "Visualização do layout das salas e bloqueio de poltronas em manutenção.",
      href: "/gestao/salas",
      icon: DoorOpen,
      badge: "Infraestrutura",
    },
    {
      title: "Atendentes",
      description: "Cadastro, ativação e redefinição de senhas para operadores da bilheteria.",
      href: "/gestao/usuarios",
      icon: Users,
      badge: "Equipe",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Header Oficial CineDoom */}
      <CineDoomHeader activePage="gestao" />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-borderDark/60 pb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Módulos de Gerenciamento</h2>
          </div>
        </div>

        {/* Grid de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group p-6 liquid-glass-card hover:border-cta/50 hover:shadow-2xl rounded-3xl transition-all duration-300 flex flex-col justify-between border border-white/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-cta/15 text-cta border border-cta/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-cta group-hover:text-white transition-all shadow-lg shadow-cta/10">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                      {m.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cta transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-borderDark/60 flex items-center justify-between text-xs font-semibold text-cta">
                  <span>Acessar Módulo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Footer minimalista */}
      <footer className="border-t border-borderDark/40 py-6 text-center text-xs text-slate-500">
        CineDoom Cinema Management &bull; Painel Administrativo
      </footer>
    </div>
  );
}
