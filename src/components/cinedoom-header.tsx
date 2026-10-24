"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthProfileMenu } from "@/components/auth-profile-menu";

interface CineDoomHeaderProps {
  activePage?: "filmes" | "sobre" | "minhas-reservas" | "nenhum";
}

export function CineDoomHeader({ activePage = "filmes" }: CineDoomHeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-16 md:h-20 liquid-glass-white transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logotipo: Favicon + Texto CineDoom */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5 group">
              <div className="relative w-[50px] h-[50px] md:w-[58px] md:h-[58px] transition-transform duration-200 group-hover:scale-105 drop-shadow-sm shrink-0">
                <Image
                  src="/logos/cinedoom-icon-color.png"
                  alt="CineDoom"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-bold text-[30px] md:text-[34px] tracking-tight text-slate-900 group-hover:text-cta transition-colors leading-none">
                CineDoom
              </span>
            </Link>
          </div>

          {/* Links de Navegação e Componente Inteligente de Validação/Perfil */}
          <div className="flex items-center">
            {/* Navegação Textual Elegante Apple-Style com Indicador Flutuante Coral */}
            <nav className="flex items-center gap-7 md:gap-9">
              <Link
                href="/"
                className="group relative py-1 text-sm md:text-[15px] font-semibold tracking-tight transition-colors flex flex-col items-center"
              >
                <span
                  className={
                    activePage === "filmes"
                      ? "text-slate-950 font-bold group-hover:text-cta transition-colors"
                      : "text-slate-600 hover:text-slate-950 font-medium transition-colors"
                  }
                >
                  Filmes
                </span>
                {activePage === "filmes" ? (
                  <span className="absolute -bottom-1.5 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cta to-rose-500 rounded-full shadow-[0_2px_6px_rgba(233,69,96,0.45)]" />
                ) : (
                  <span className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-slate-300 scale-x-0 group-hover:scale-x-100 transition-transform origin-center rounded-full" />
                )}
              </Link>

              <Link
                href="/sobre"
                className="group relative py-1 text-sm md:text-[15px] font-semibold tracking-tight transition-colors flex flex-col items-center whitespace-nowrap"
              >
                <span
                  className={
                    activePage === "sobre"
                      ? "text-slate-950 font-bold group-hover:text-cta transition-colors"
                      : "text-slate-600 hover:text-slate-950 font-medium transition-colors"
                  }
                >
                  Sobre o CineDoom
                </span>
                {activePage === "sobre" ? (
                  <span className="absolute -bottom-1.5 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cta to-rose-500 rounded-full shadow-[0_2px_6px_rgba(233,69,96,0.45)]" />
                ) : (
                  <span className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-slate-300 scale-x-0 group-hover:scale-x-100 transition-transform origin-center rounded-full" />
                )}
              </Link>
            </nav>

            {/* Componente Unificado Inteligente de Validação de Usuário (Cliente, Atendente, Gerente) */}
            <AuthProfileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
