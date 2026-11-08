"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  User,
  Ticket,
  Film,
  Info,
  LogOut,
  ShieldCheck,
  Calendar,
  LayoutGrid,
  Users,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Briefcase
} from "lucide-react";
import { useAuthModal } from "@/contexts/auth-modal-context";

// Helper para exibir Primeiro e Ultimo nome do cliente
function getFirstAndLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function AuthProfileMenu() {
  const { data: session } = useSession();
  const { openLogin } = useAuthModal();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora ou ao pressionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ================= CASO 1: NAO AUTENTICADO =================
  // Botao unico "Entre ou Cadastre-se" que aciona o modal de login sobre o fundo borrado
  if (!session) {
    return (
      <div className="relative ml-2 sm:ml-4 md:ml-8 lg:ml-10 shrink-0 flex items-center h-full">
        <button
          type="button"
          onClick={openLogin}
          className="h-9 sm:h-10 md:h-11 flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 md:px-5 rounded-full bg-gradient-to-r from-[#0F3460] to-[#16213E] hover:from-[#133c6d] hover:to-[#1a2544] text-white border border-white/25 shadow-[0_4px_16px_rgba(15,52,96,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_6px_22px_rgba(15,52,96,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.5)] transition-all group cursor-pointer active:scale-95"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white group-hover:bg-cta group-hover:border-cta group-hover:shadow-[0_0_12px_rgba(233,69,96,0.5)] transition-all shrink-0">
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
          </div>
          <span className="font-semibold text-xs md:text-[13px] text-white tracking-wide whitespace-nowrap">
            <span className="hidden sm:inline">Entre ou </span>Cadastre-se
          </span>
        </button>
      </div>
    );
  }

  // ================= CASO 2: AUTENTICADO =================
  const role = session.user?.role;
  const userName = session.user?.name || "Cliente";
  const userEmail = session.user?.email || "";
  const displayName = getFirstAndLastName(userName);

  return (
    <div
      ref={containerRef}
      className="relative ml-2 sm:ml-4 md:ml-8 lg:ml-10 shrink-0 flex items-center h-full"
    >
      {/* Botao de Perfil: Navy Liquid Glass (Abertura exclusivamente por clique) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`h-9 sm:h-10 md:h-11 flex items-center justify-between gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 md:px-4 rounded-full bg-gradient-to-r from-[#0F3460] to-[#16213E] hover:from-[#133c6d] hover:to-[#1a2544] text-white border transition-all cursor-pointer group ${
          isOpen
            ? "border-white/40 shadow-[0_6px_22px_rgba(15,52,96,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.5)] from-[#0F3460] to-[#16213E]"
            : "border-white/25 shadow-[0_4px_16px_rgba(15,52,96,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_6px_22px_rgba(15,52,96,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.5)]"
        }`}
      >
        {/* Avatar / Icone com indicacao de perfil */}
        <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white group-hover:bg-cta group-hover:border-cta group-hover:shadow-[0_0_12px_rgba(233,69,96,0.5)] transition-all shrink-0">
          {role === "GERENTE" ? (
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-amber-300" />
          ) : role === "ATENDENTE" ? (
            <Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-300" />
          ) : (
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
          )}
        </div>

        {/* Texto do Botao */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-left">
          <span className="font-semibold text-xs md:text-[13px] text-white tracking-wide whitespace-nowrap max-w-[70px] sm:max-w-[130px] md:max-w-[180px] truncate">
            {displayName}
          </span>
          {role === "GERENTE" && (
            <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cta text-white shadow-xs">
              Gerente
            </span>
          )}
          {role === "ATENDENTE" && (
            <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500 text-white shadow-xs">
              Atendente
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-white" : "group-hover:translate-y-0.5"
            }`}
          />
        </div>
      </button>

      {/* Modulo Flutuante Aberto exclusivamente no Clique do Usuario Autenticado */}
      {isOpen && (
        <div
          role="menu"
          className="absolute top-full mt-2 sm:mt-3 right-0 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="w-full liquid-glass-menu rounded-3xl p-3.5 space-y-3">
            {/* Card de Identificacao (Sem superfície aninhada opaca — Regra 3 Liquid Glass) */}
            <div className="p-3 rounded-2xl bg-white/[0.04] space-y-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white break-words leading-snug">
                    {userName}
                  </span>
                  {role === "GERENTE" ? (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-cta to-rose-600 text-white shadow-sm">
                      Gerente Geral
                    </span>
                  ) : role === "ATENDENTE" ? (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500 text-white shadow-sm">
                      Atendente
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-slate-200 shadow-sm">
                      Cliente
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 break-all leading-tight">{userEmail}</p>
              </div>
            </div>

            {/* Links de Sessao / Papeis */}
            <div className="space-y-1 text-xs font-medium">
              {role === "GERENTE" && (
                <>
                  <span className="px-2.5 pt-1 pb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Painel de Gestao
                  </span>
                  <Link
                    href="/gestao"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Briefcase className="w-4 h-4 text-cta shrink-0" />
                    <span>Visao Geral da Gestao</span>
                  </Link>
                  <Link
                    href="/gestao/filmes"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Film className="w-4 h-4 text-cta shrink-0" />
                    <span>Catalogo de Filmes</span>
                  </Link>
                  <Link
                    href="/gestao/salas"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <LayoutGrid className="w-4 h-4 text-cta shrink-0" />
                    <span>Salas e Disposicao de Assentos</span>
                  </Link>
                  <Link
                    href="/gestao/sessoes"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-cta shrink-0" />
                    <span>Agendamento de Sessoes</span>
                  </Link>
                  <Link
                    href="/gestao/usuarios"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Users className="w-4 h-4 text-cta shrink-0" />
                    <span>Gestao de Atendentes</span>
                  </Link>
                  <Link
                    href="/gestao/titulares"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-cta shrink-0" />
                    <span>Compliance LGPD (Art. 18)</span>
                  </Link>
                  <Link
                    href="/bilheteria"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors border-t border-white/10 pt-2"
                  >
                    <Ticket className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Abrir Bilheteria Operacional</span>
                  </Link>
                </>
              )}

              {role === "ATENDENTE" && (
                <>
                  <span className="px-2.5 pt-1 pb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Operacao da Bilheteria
                  </span>
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Ticket className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Balcão de Vendas (Sessões de Hoje)</span>
                  </Link>
                  <Link
                    href="/bilheteria"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <LayoutGrid className="w-4 h-4 text-cta shrink-0" />
                    <span>Mapa de Sala (PDV Direto)</span>
                  </Link>
                  <Link
                    href="/bilheteria/baixa-reserva"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Baixa Presencial de Reserva</span>
                  </Link>
                </>
              )}

              {role === "CLIENTE" && (
                <>
                  <span className="px-2.5 pt-1 pb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Area do Cliente
                  </span>
                  <Link
                    href="/portal/minhas-reservas"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-4 h-4 text-cta shrink-0" />
                      <span className="font-semibold">Minhas Reservas</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform shrink-0" />
                  </Link>
                  <Link
                    href="/#programacao"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Film className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Programacao CineDoom</span>
                  </Link>
                  <Link
                    href="/sobre"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Sobre o CineDoom</span>
                  </Link>
                </>
              )}

              {/* Botao de Logout */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-300 hover:text-rose-100 transition-colors text-xs font-semibold cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="truncate">Sair da Conta</span>
                  </div>
                  <span className="text-[11px] text-rose-400/80 font-normal truncate max-w-[120px]">
                    {displayName}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
