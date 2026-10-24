"use client";

import React, { useEffect } from "react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { AuthCard } from "@/components/auth-card";

export default function LoginPage() {
  // Trava de rolagem total da janela (Zero Rolagem)
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-[#0A0E1A] selection:bg-cta selection:text-white">
      {/* Fundo Simulado da Tela Inicial com Desfoque Cinematográfico (Backdrop Blur) */}
      <div className="absolute inset-0 pointer-events-none filter blur-xl opacity-40 scale-105">
        <CineDoomHeader activePage="nenhum" />
        <div className="max-w-7xl mx-auto px-6 pt-16 grid grid-cols-3 gap-6">
          <div className="h-64 rounded-3xl bg-gradient-to-br from-indigo-900/60 to-purple-900/40" />
          <div className="h-64 rounded-3xl bg-gradient-to-br from-rose-900/60 to-slate-900/40" />
          <div className="h-64 rounded-3xl bg-gradient-to-br from-blue-900/60 to-slate-900/40" />
        </div>
      </div>

      {/* Camada Escura com Desfoque Apple Glass */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="my-auto w-full max-w-md">
          <AuthCard initialView="login" isModal={false} />
        </div>
      </div>
    </div>
  );
}
