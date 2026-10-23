"use client";

import Link from "next/link";
import { Film, DoorOpen, Calendar, Users, BarChart3, ShieldCheck, ArrowRight } from "lucide-react";

export default function BackofficeDashboardPage() {
  const modules = [
    {
      title: "Catálogo de Filmes",
      description: "Cadastro de obras cinematográficas, classificação indicativa, pôsteres e sinopses.",
      href: "/backoffice/filmes",
      icon: Film,
      badge: "Catálogo",
    },
    {
      title: "Salas & Layouts",
      description: "Configuração física de salas, capacidade e grade de poltronas.",
      href: "/backoffice/salas",
      icon: DoorOpen,
      badge: "Infraestrutura",
    },
    {
      title: "Programação & Sessões",
      description: "Agendamento de sessões com prevenção de conflitos e pré-população de assentos.",
      href: "/backoffice/sessoes",
      icon: Calendar,
      badge: "Programação",
    },
    {
      title: "Gestão de Atendentes",
      description: "Cadastro, ativação e redefinição de senhas para operadores da bilheteria (FRAME-7).",
      href: "/backoffice/usuarios",
      icon: Users,
      badge: "Equipe",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#2D2D2D] font-sans">
      {/* Top Header */}
      <header className="bg-[#1A1A2E] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E94560] flex items-center justify-center font-bold text-white shadow-md">
              CD
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Painel Administrativo do Gerente</h1>
              <p className="text-xs text-gray-400">
                Back-office de controle do cinema — CineDoom SaaS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/bilheteria"
              className="text-xs font-semibold px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              Ir para Bilheteria
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1A1A2E]">Módulos de Gerenciamento</h2>
            <p className="text-sm text-gray-600 mt-1">
              Selecione o módulo para configurar as operações do seu cinema.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Perfil Autenticado: GERENTE</span>
          </div>
        </div>

        {/* Grid de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group p-6 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-[#E94560]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-[#E94560]/10 text-[#E94560] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {m.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#E94560] transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#E94560]">
                  <span>Acessar Módulo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
