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
  Briefcase,
  X,
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
    <>
      <div
        ref={containerRef}
        className="relative ml-2 sm:ml-4 md:ml-6 lg:ml-8 shrink-0 flex items-center gap-2 h-full"
      >
        {/* Botao de Perfil: Navy Liquid Glass */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title={`Conectado como ${displayName} (${role || "CLIENTE"}). Clique para ver detalhes e opções.`}
          className="h-9 sm:h-10 md:h-11 flex items-center justify-between gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 md:px-4 rounded-full bg-gradient-to-r from-[#0F3460] to-[#16213E] hover:from-[#133c6d] hover:to-[#1a2544] text-white border border-white/25 shadow-[0_4px_16px_rgba(15,52,96,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_6px_22px_rgba(15,52,96,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.5)] transition-all cursor-pointer group active:scale-95"
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
          </div>
        </button>

        {/* Botao Direto de Logout no Header */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title={`Sair da conta (${displayName})`}
          className="h-9 sm:h-10 md:h-11 px-2.5 sm:px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 hover:text-rose-700 border border-rose-500/30 transition-all flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95"
          aria-label="Sair da conta"
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="hidden xl:inline">Sair</span>
        </button>
      </div>

      {/* Modal Central de Perfil / Logout (Opção 3 / Sem conflito com conteúdo da tela) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          className="liquid-glass-scrim z-[100] p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="relative my-auto w-full max-w-sm liquid-glass liquid-glass--modal rounded-3xl p-6 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 space-y-5">
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cabeçalho do Usuário */}
            <div className="flex items-center gap-3.5 pr-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0F3460] to-cta flex items-center justify-center text-white shadow-lg shrink-0">
                {role === "GERENTE" ? (
                  <ShieldCheck className="w-6 h-6 text-amber-300" />
                ) : role === "ATENDENTE" ? (
                  <Briefcase className="w-6 h-6 text-blue-200" />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h3 id="profile-modal-title" className="text-base font-bold text-white truncate">
                  {userName}
                </h3>
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                <div className="mt-1">
                  {role === "GERENTE" ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cta text-white">
                      Gerente Geral
                    </span>
                  ) : role === "ATENDENTE" ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500 text-white">
                      Atendente de Bilheteria
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-slate-200">
                      Cliente
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Atalhos Rápidos no Modal */}
            <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs font-medium">
              {role === "ATENDENTE" ? (
                <>
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-4 h-4 text-cta" />
                      <span>Balcão de Vendas (Hoje)</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                  <Link
                    href="/bilheteria"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid className="w-4 h-4 text-slate-400" />
                      <span>Mapa de Sala (PDV Direto)</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                  <Link
                    href="/bilheteria/baixa-reserva"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      <span>Baixa Presencial de Reserva</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                </>
              ) : role === "GERENTE" ? (
                <>
                  <Link
                    href="/gestao"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="w-4 h-4 text-cta" />
                      <span>Painel de Gestão Administrativa</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                  <Link
                    href="/bilheteria"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-4 h-4 text-emerald-400" />
                      <span>Abrir Bilheteria</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/portal/minhas-reservas"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-4 h-4 text-cta" />
                      <span>Minhas Reservas</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                </>
              )}
            </div>

            {/* Ação de Logout */}
            <div className="pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 border border-rose-500/30 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Sair da Conta ({displayName})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
