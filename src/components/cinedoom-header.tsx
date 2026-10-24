"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthProfileMenu } from "@/components/auth-profile-menu";
import { Menu, X, Film, Info, Sparkles } from "lucide-react";

interface CineDoomHeaderProps {
  activePage?: "filmes" | "sobre" | "minhas-reservas" | "nenhum";
}

export function CineDoomHeader({ activePage = "filmes" }: CineDoomHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fecha o menu móvel ao redimensionar para telas maiores
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 liquid-glass-white transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10 h-16 md:h-20">
        <div className="flex items-center justify-between h-full">
          {/* Logotipo: Favicon + Texto CineDoom */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
              <div className="relative w-8 h-8 sm:w-11 sm:h-11 md:w-[54px] md:h-[54px] transition-transform duration-200 group-hover:scale-105 drop-shadow-sm shrink-0">
                <Image
                  src="/logos/cinedoom-icon-color.png"
                  alt="CineDoom"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-bold text-xl sm:text-2xl md:text-[32px] tracking-tight text-slate-900 group-hover:text-cta transition-colors leading-none">
                CineDoom
              </span>
            </Link>
          </div>

          {/* Links de Navegação Desktop & Componente de Usuário */}
          <div className="flex items-center">
            {/* Navegação Desktop */}
            <nav className="hidden md:flex items-center gap-7 lg:gap-9">
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

            {/* Componente Unificado de Validação/Perfil */}
            <AuthProfileMenu />

            {/* Botão de Menu Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden ml-2 p-2 rounded-xl text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors focus:outline-none"
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-900" />
              ) : (
                <Menu className="w-5 h-5 text-slate-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown de Navegação Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                activePage === "filmes"
                  ? "bg-cta/10 text-cta font-bold"
                  : "text-slate-800 hover:bg-slate-100/70"
              }`}
            >
              <Film className="w-4 h-4 text-cta" />
              <span>Programação de Filmes</span>
            </Link>

            <Link
              href="/sobre"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                activePage === "sobre"
                  ? "bg-cta/10 text-cta font-bold"
                  : "text-slate-800 hover:bg-slate-100/70"
              }`}
            >
              <Info className="w-4 h-4 text-cta" />
              <span>Sobre o CineDoom</span>
            </Link>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between px-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cta" />
                4 Salas • 420 Lugares • Sem taxas
              </span>
              <span className="font-semibold text-slate-700">Bilheteria Física</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
