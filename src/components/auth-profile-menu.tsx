"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import {
  User,
  LogOut,
  BadgePercent,
  Ticket,
  SlidersHorizontal,
} from "lucide-react";
import { useAuthModal } from "@/contexts/auth-modal-context";

// Helper para exibir Primeiro e Ultimo nome do cliente
function getFirstAndLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Lucas Mendes";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function AuthProfileMenu() {
  const { data: session } = useSession();
  const { openLogin } = useAuthModal();

  // ================= CASO 1: NAO AUTENTICADO =================
  // Botao unico "Entre ou Cadastre-se" que aciona o modal de login sobre o fundo borrado
  if (!session) {
    return (
      <div className="relative ml-2 sm:ml-4 md:ml-6 lg:ml-8 shrink-0 flex items-center h-full">
        <button
          type="button"
          onClick={openLogin}
          className="h-9 sm:h-10 md:h-11 flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 md:px-5 rounded-full bg-gradient-to-r from-[#0F3460] to-[#16213E] hover:from-[#133c6d] hover:to-[#1a2544] text-white border border-white/10 shadow-[0_4px_16px_rgba(15,52,96,0.25)] hover:shadow-[0_6px_22px_rgba(15,52,96,0.35)] transition-all group cursor-pointer active:scale-95"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-cta group-hover:shadow-[0_0_12px_rgba(233,69,96,0.4)] transition-all shrink-0">
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
          </div>
          <span className="font-semibold text-xs md:text-[13px] text-white tracking-wide whitespace-nowrap">
            <span className="hidden sm:inline">Entre ou </span>Cadastre-se
          </span>
        </button>
      </div>
    );
  }

  // ================= CASO 2: AUTENTICADO (CRACHÁ COM NOME + LABEL E ÍCONE REPRESENTATIVO) =================
  const role = session.user?.role;
  const rawName = session.user?.name;
  // Nome fictício realista se o backend retornar vazio ou valor genérico
  const fallbackName =
    role === "GERENTE"
      ? "Carlos Eduardo"
      : role === "ATENDENTE"
        ? "Kayque Vicente"
        : "Lucas Mendes";

  const resolvedName =
    !rawName || rawName === "Cliente" || rawName.includes("CineDoom") || rawName.includes("Bilheteria")
      ? fallbackName
      : rawName;

  const displayName = getFirstAndLastName(resolvedName);

  return (
    <div className="relative ml-2 sm:ml-4 md:ml-6 lg:ml-8 shrink-0 flex items-center gap-2 h-full">
      {/* Crachá / Badge de Identificação do Usuário Logado */}
      <div
        title={`Conectado como ${displayName} (${role || "CLIENTE"})`}
        className="h-9 sm:h-10 md:h-11 flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 md:px-4 rounded-full bg-gradient-to-r from-[#0F3460] to-[#16213E] text-white border border-white/10 shadow-[0_4px_16px_rgba(15,52,96,0.25)] select-none"
      >
        {/* Avatar / Ícone de perfil em branco */}
        <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
          {role === "GERENTE" ? (
            <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
          ) : role === "ATENDENTE" ? (
            <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
          ) : (
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
          )}
        </div>

        {/* Nome da Pessoa + Label do Perfil ao lado em branco */}
        <div className="flex items-center gap-1 sm:gap-2 text-left">
          <span className="font-semibold text-xs md:text-[13px] text-white tracking-wide whitespace-nowrap max-w-[70px] sm:max-w-[130px] md:max-w-[180px] truncate">
            {displayName}
          </span>

          {role === "GERENTE" && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/15 text-white border border-white/20">
              Gerente
            </span>
          )}
          {role === "ATENDENTE" && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/15 text-white border border-white/20">
              Atendente
            </span>
          )}
          {(!role || role === "CLIENTE") && (
            <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/15 text-white border border-white/20">
              Cliente
            </span>
          )}
        </div>
      </div>

      {/* Botão Direto de Logout com 1 Clique */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        title={`Sair da conta (${displayName})`}
        className="h-9 sm:h-10 md:h-11 px-2.5 sm:px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 hover:text-rose-700 border border-rose-500/20 transition-all flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95"
        aria-label="Sair da conta"
      >
        <LogOut className="w-4 h-4 shrink-0 text-rose-600" />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </div>
  );
}
