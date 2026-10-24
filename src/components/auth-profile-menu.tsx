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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Manipuladores de Hover apenas para usuario autenticado
  const handleMouseEnter = () => {
    if (!session) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (!session) return;
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ================= CASO 1: NAO AUTENTICADO =================
  // Botao unico "Entre ou Cadastre-se" que aciona o modal de login sobre o fundo borrado
  if (!session) {
    return (
      <div className="relative ml-6 md:ml-10 lg:ml-14 shrink-0 flex items-center h-full">
        <button
          type="button"
          onClick={openLogin}
          className="h-10 md:h-11 flex items-center gap-2.5 px-4 md:px-5 rounded-full bg-gradient-to-r from-[#0F3460] to-[#16213E] hover:from-[#133c6d] hover:to-[#1a2544] text-white border border-white/25 shadow-[0_4px_16px_rgba(15,52,96,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_6px_22px_rgba(15,52,96,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.5)] transition-all group cursor-pointer active:scale-95"
        >
          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white group-hover:bg-cta group-hover:border-cta group-hover:shadow-[0_0_12px_rgba(233,69,96,0.5)] transition-all shrink-0">
            <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
          </div>
          <span className="font-semibold text-xs md:text-[13px] text-white tracking-wide whitespace-nowrap">
            Entre ou Cadastre-se
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative ml-6 md:ml-10 lg:ml-14 shrink-0 flex items-center h-full"
    >
      {/* Botao de Perfil: Navy Liquid Glass */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`h-10 md:h-11 flex items-center justify-between gap-2.5 px-3.5 md:px-4 rounded-full bg-gradient-to-r from-[#0F3460] to-[#16213E] hover:from-[#133c6d] hover:to-[#1a2544] text-white border transition-all group ${
          isOpen
            ? "border-white/40 shadow-[0_6px_22px_rgba(15,52,96,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.5)] from-[#0F3460] to-[#16213E]"
            : "border-white/25 shadow-[0_4px_16px_rgba(15,52,96,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_6px_22px_rgba(15,52,96,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.5)]"
        }`}
      >
        {/* Avatar / Icone com indicacao de perfil */}
        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white group-hover:bg-cta group-hover:border-cta group-hover:shadow-[0_0_12px_rgba(233,69,96,0.5)] transition-all shrink-0">
          {role === "GERENTE" ? (
            <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-300" />
          ) : role === "ATENDENTE" ? (
            <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-300" />
          ) : (
            <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
          )}
        </div>

        {/* Texto do Botao */}
        <div className="flex items-center gap-1.5 text-left">
          <span className="font-semibold text-xs md:text-[13px] text-white tracking-wide whitespace-nowrap max-w-[140px] md:max-w-[180px] truncate">
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

      {/* Modulo Flutuante Aberto no Hover/Click do Usuario Autenticado */}
      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute top-full mt-1 right-0 w-72 sm:w-80 z-50 animate-in fade-in slide-in-from-top-1 duration-150 before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3"
        >
          <div className="w-full bg-[#12182B] rounded-3xl p-3 border border-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.2)] space-y-3">
            {/* Card de Identificacao */}
            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-white truncate">{userName}</span>
                {role === "GERENTE" ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-cta to-rose-600 text-white shadow-sm">
                    Gerente Geral
                  </span>
                ) : role === "ATENDENTE" ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500 text-white shadow-sm">
                    Atendente de Bilheteria
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-slate-200 shadow-sm">
                    Cliente CineDoom
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">{userEmail}</p>
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
                    <Briefcase className="w-4 h-4 text-cta" />
                    <span>Visao Geral da Gestao</span>
                  </Link>
                  <Link
                    href="/gestao/filmes"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Film className="w-4 h-4 text-cta" />
                    <span>Catalogo de Filmes</span>
                  </Link>
                  <Link
                    href="/gestao/salas"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <LayoutGrid className="w-4 h-4 text-cta" />
                    <span>Salas e Disposicao de Assentos</span>
                  </Link>
                  <Link
                    href="/gestao/sessoes"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-cta" />
                    <span>Agendamento de Sessoes</span>
                  </Link>
                  <Link
                    href="/gestao/usuarios"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Users className="w-4 h-4 text-cta" />
                    <span>Gestao de Atendentes</span>
                  </Link>
                  <Link
                    href="/gestao/titulares"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-cta" />
                    <span>Compliance LGPD (Art. 18)</span>
                  </Link>
                  <Link
                    href="/bilheteria"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors border-t border-white/10 pt-2"
                  >
                    <Ticket className="w-4 h-4 text-emerald-400" />
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
                    href="/bilheteria"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Ticket className="w-4 h-4 text-emerald-400" />
                    <span>Balcao de Vendas (FRAME-2)</span>
                  </Link>
                  <Link
                    href="/bilheteria/baixa-reserva"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>Baixa Presencial de Reserva</span>
                  </Link>
                  <Link
                    href="/#programacao"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Film className="w-4 h-4 text-cta" />
                    <span>Ver Programacao em Cartaz</span>
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
                      <Ticket className="w-4 h-4 text-cta" />
                      <span className="font-semibold">Minhas Reservas</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/#programacao"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Film className="w-4 h-4 text-slate-400" />
                    <span>Programacao CineDoom</span>
                  </Link>
                  <Link
                    href="/sobre"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <Info className="w-4 h-4 text-slate-400" />
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-300 hover:text-rose-100 transition-colors text-xs font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sair da Conta ({displayName})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
