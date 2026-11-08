"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { AuthProfileMenu } from "@/components/auth-profile-menu";
import {
  Menu,
  X,
  Film,
  Info,
  Sparkles,
  Ticket,
  LayoutGrid,
  CheckCircle2,
  Briefcase,
  ShieldCheck,
  Calendar,
  Users,
} from "lucide-react";

interface CineDoomHeaderProps {
  activePage?: "filmes" | "sobre" | "minhas-reservas" | "nenhum";
}

export function CineDoomHeader({ activePage = "filmes" }: CineDoomHeaderProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
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
            {/* Navegação Desktop Integrada conforme o Perfil */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {role === "ATENDENTE" ? (
                <>
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5 text-cta" />
                    <span>Balcão de Vendas</span>
                  </Link>
                  <Link
                    href="/bilheteria"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
                    <span>Mapa de Sala</span>
                  </Link>
                  <Link
                    href="/bilheteria/baixa-reserva"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Baixa Reserva</span>
                  </Link>
                </>
              ) : role === "GERENTE" ? (
                <>
                  <Link
                    href="/gestao"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-cta" />
                    <span>Gestão</span>
                  </Link>
                  <Link
                    href="/gestao/filmes"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <Film className="w-3.5 h-3.5 text-slate-600" />
                    <span>Filmes</span>
                  </Link>
                  <Link
                    href="/gestao/salas"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
                    <span>Salas</span>
                  </Link>
                  <Link
                    href="/gestao/sessoes"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span>Sessões</span>
                  </Link>
                  <Link
                    href="/gestao/usuarios"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    <span>Equipe</span>
                  </Link>
                  <Link
                    href="/gestao/titulares"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 hover:text-cta hover:bg-slate-100/80 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>LGPD</span>
                  </Link>
                  <Link
                    href="/bilheteria"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-cta hover:bg-cta-hover transition-colors shadow-sm"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Bilheteria</span>
                  </Link>
                </>
              ) : (
                <>
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

                  {role === "CLIENTE" && (
                    <Link
                      href="/portal/minhas-reservas"
                      className="group relative py-1 text-sm md:text-[15px] font-semibold tracking-tight transition-colors flex flex-col items-center"
                    >
                      <span
                        className={
                          activePage === "minhas-reservas"
                            ? "text-slate-950 font-bold group-hover:text-cta transition-colors"
                            : "text-slate-600 hover:text-slate-950 font-medium transition-colors"
                        }
                      >
                        Minhas Reservas
                      </span>
                      {activePage === "minhas-reservas" ? (
                        <span className="absolute -bottom-1.5 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cta to-rose-500 rounded-full shadow-[0_2px_6px_rgba(233,69,96,0.45)]" />
                      ) : (
                        <span className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-slate-300 scale-x-0 group-hover:scale-x-100 transition-transform origin-center rounded-full" />
                      )}
                    </Link>
                  )}

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
                </>
              )}
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
            {role === "ATENDENTE" ? (
              <>
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <Ticket className="w-4 h-4 text-cta" />
                  <span>Balcão de Vendas</span>
                </Link>
                <Link
                  href="/bilheteria"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <LayoutGrid className="w-4 h-4 text-slate-600" />
                  <span>Mapa de Sala (PDV)</span>
                </Link>
                <Link
                  href="/bilheteria/baixa-reserva"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Baixa de Reserva</span>
                </Link>
              </>
            ) : role === "GERENTE" ? (
              <>
                <Link
                  href="/gestao"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <Briefcase className="w-4 h-4 text-cta" />
                  <span>Visão Geral da Gestão</span>
                </Link>
                <Link
                  href="/gestao/filmes"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <Film className="w-4 h-4 text-slate-600" />
                  <span>Catálogo de Filmes</span>
                </Link>
                <Link
                  href="/gestao/salas"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <LayoutGrid className="w-4 h-4 text-slate-600" />
                  <span>Salas e Assentos</span>
                </Link>
                <Link
                  href="/gestao/sessoes"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span>Agendamento de Sessões</span>
                </Link>
                <Link
                  href="/gestao/usuarios"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <Users className="w-4 h-4 text-slate-600" />
                  <span>Gestão de Atendentes</span>
                </Link>
                <Link
                  href="/gestao/titulares"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-100/70"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Compliance LGPD</span>
                </Link>
                <Link
                  href="/bilheteria"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-cta font-bold hover:bg-slate-100/70"
                >
                  <Ticket className="w-4 h-4 text-cta" />
                  <span>Abrir Bilheteria</span>
                </Link>
              </>
            ) : (
              <>
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

                {role === "CLIENTE" && (
                  <Link
                    href="/portal/minhas-reservas"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                      activePage === "minhas-reservas"
                        ? "bg-cta/10 text-cta font-bold"
                        : "text-slate-800 hover:bg-slate-100/70"
                    }`}
                  >
                    <Ticket className="w-4 h-4 text-cta" />
                    <span>Minhas Reservas</span>
                  </Link>
                )}

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
              </>
            )}

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
