"use client";

import Link from "next/link";
import { Film, DoorOpen, Calendar, Users, ShieldCheck, ArrowRight, UserCheck } from "lucide-react";

export default function GestãoDashboardPage() {
  const modules = [
    {
      title: "Catálogo de Filmes",
      description: "Cadastro de obras cinematográficas, classificação indicativa, pôsteres e sinopses.",
      href: "/gestao/filmes",
      icon: Film,
      badge: "Catálogo",
    },
    {
      title: "Salas & Layouts",
      description: "Configuração física de salas, capacidade e grade de poltronas.",
      href: "/gestao/salas",
      icon: DoorOpen,
      badge: "Infraestrutura",
    },
    {
      title: "Programação & Sessões",
      description: "Agendamento e gerenciamento de sessões, salas e horários.",
      href: "/gestao/sessoes",
      icon: Calendar,
      badge: "Programação",
    },
    {
      title: "Gestão de Atendentes",
      description: "Cadastro, ativação e redefinição de senhas para operadores da bilheteria.",
      href: "/gestao/usuarios",
      icon: Users,
      badge: "Equipe",
    },
    {
      title: "Compliance LGPD (Art. 18)",
      description: "Atendimento aos direitos do titular e anonimização com preservação fiscal.",
      href: "/gestao/titulares",
      icon: ShieldCheck,
      badge: "Segurança & LGPD",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 liquid-glass-card border-x-0 border-t-0 rounded-none text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-cta flex items-center justify-center font-bold text-white shadow-lg shadow-cta/25 shrink-0 hover:scale-105 transition-transform" title="Ir para a Página Inicial">
              CD
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Painel Administrativo do Gerente
              </h1>
              <p className="text-xs text-slate-400">
                Gestão central e governança do cinema — CineDoom
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Link
              href="/"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-slate-200 hover:text-white shadow-sm"
            >
              Início
            </Link>
            <Link
              href="/bilheteria"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-cta hover:bg-cta-hover transition-all text-white shadow-lg shadow-cta/25"
            >
              Ir para Bilheteria
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-borderDark/60 pb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Módulos de Gerenciamento</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Selecione o módulo para configurar as operações e a conformidade do seu cinema.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full self-start sm:self-auto shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Perfil Autenticado: GERENTE</span>
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
