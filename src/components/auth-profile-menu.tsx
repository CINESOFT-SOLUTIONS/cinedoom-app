"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import {
  User,
  LogOut,
  ShieldCheck,
  Briefcase,
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

  // ================= CASO 1: NAO AUTENTICADO =================
  // Botao unico "Entre ou Cadastre-se" que aciona o modal de login sobre o fundo borrado
  if (!session) {
    return (
      <div className="relative ml-2 sm:ml-4 md:ml-6 lg:ml-8 shrink-0 flex items-center h-full">
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

  // ================= CASO 2: AUTENTICADO (CRACHÁ VISUAL + BOTÃO SAIR) =================
  const role = session.user?.role;
  const userName = session.user?.name || "Cliente";
  const displayName = getFirstAndLastName(userName);

  return (
    <div className="relative ml-2 sm:ml-4 md:ml-6 lg:ml-8 shrink-0 flex items-center gap-2 h-full">
      {/* Crachá / Badge de Identificação do Usuário Logado */}
      <div
        title={`Conectado como ${userName} (${role || "CLIENTE"})`}
        className="h-9 sm:h-10 md:h-11 flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 md:px-4 rounded-full bg-gradient-to-r from-[#0F3460] to-[#16213E] text-white border border-white/25 shadow-[0_4px_16px_rgba(15,52,96,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] select-none"
      >
        {/* Avatar / Ícone com indicação de perfil */}
        <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0">
          {role === "GERENTE" ? (
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-amber-300" />
          ) : role === "ATENDENTE" ? (
            <Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-300" />
          ) : (
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
          )}
        </div>

        {/* Texto do Crachá */}
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
      </div>

      {/* Botão Direto de Logout com 1 Clique */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        title={`Sair da conta (${displayName})`}
        className="h-9 sm:h-10 md:h-11 px-2.5 sm:px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 hover:text-rose-700 border border-rose-500/30 transition-all flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95"
        aria-label="Sair da conta"
      >
        <LogOut className="w-4 h-4 shrink-0 text-rose-600" />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </div>
  );
}
