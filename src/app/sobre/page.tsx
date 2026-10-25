"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { InteractiveGlowCard } from "@/components/interactive-glow-card";
import {
  Sparkles,
  Film,
  Volume2,
  Tv,
  Armchair,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Heart,
  Eye,
} from "lucide-react";

const SPACES_SLIDES = [
  {
    id: "lobby",
    title: "Recepção & Lounge CineDoom",
    subtitle: "O Ponto de Encontro da Sua Noite",
    badge: "Recepção & Espera",
    description:
      "Um espaço acolhedor para você retirar seus ingressos e pipoca com tranquilidade e esperar seus amigos antes da sessão começar.",
    image: "/images/sobre/lobby.jpg",
  },
  {
    id: "classica",
    title: "Salas 1 e 2 • CLÁSSICA",
    subtitle: "O Cinema Tradicional na Tela Grande",
    badge: "Salas 1 e 2 • 120 Lugares por sala",
    description:
      "Aproveite seus filmes favoritos em uma sala projetada para proporcionar conforto e uma ótima experiência audiovisual, com tela ampla, som de qualidade e poltronas espaçosas.",
    image: "/images/sobre/sala-classica.jpg",
  },
  {
    id: "imax",
    title: "Sala 3 • IMAX",
    subtitle: "Máxima Imersão Visual e Sonora",
    badge: "Sala 3 • 120 Lugares",
    description:
      "Viva o cinema em outra escala, com imagens de alta nitidez, uma tela de grandes dimensões e som potente que envolve você em cada cena.",
    image: "/images/sobre/sala-imax.jpg",
  },
  {
    id: "vip",
    title: "Sala 4 • VIP",
    subtitle: "Mais Conforto e Privacidade",
    badge: "Sala 4 • 60 Lugares",
    description:
      "Desfrute de uma sessão mais confortável em poltronas reclináveis, com mesas individuais para apoiar suas bebidas e petiscos. Um ambiente pensado para você relaxar e aproveitar o filme no seu próprio ritmo.",
    image: "/images/sobre/sala-vip.jpg",
  },
];

export default function SobreCineDoomPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play do Carrossel (5 segundos), pausavel ao passar o mouse
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SPACES_SLIDES.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? SPACES_SLIDES.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SPACES_SLIDES.length);
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* 1. Cabecalho Superior CineDoom (White Liquid Glass) */}
      <CineDoomHeader activePage="sobre" />

      {/* Conteudo Principal */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-14 space-y-12 sm:space-y-16 md:space-y-20">
        {/* ================= HERO PRINCIPAL ================= */}
        <section className="text-center max-w-3xl mx-auto space-y-4 pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cta/10 border border-cta/30 text-cta text-xs font-semibold uppercase tracking-wider shadow-sm animate-in fade-in duration-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>O Cinema Como Ele Deve Ser</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            A Magia da Tela Grande com o Conforto que Você Merece
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Quatro salas, tecnologia de ponta e conforto em cada detalhe. Da imagem ao som, das poltronas à pipoca na manteiga, tudo se une para tornar sua ida ao cinema especial. E o melhor: sem taxas de conveniência.
          </p>
        </section>

        {/* ================= CARROSSEL DE AMBIENTES REAIS ================= */}
        <section
          id="espacos"
          className="space-y-4"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-cta uppercase tracking-wider block">
                Galeria dos Espaços
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                Conheça nossa Estrutura
              </h2>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                aria-label="Ambiente anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                aria-label="Próximo ambiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Janela de Visualizacao do Carrossel */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)] group bg-slate-900">
            {SPACES_SLIDES.map((slide, index) => {
              const isActive = index === currentSlide;
              return (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                    }`}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-1000 ease-out"
                    priority={index === 0}
                  />

                  {/* Gradiente Escuro para Legibilidade Impecavel */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  {/* Legenda Informativa Flutuante */}
                  <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8 md:p-10 space-y-2 max-w-3xl">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cta text-white shadow-md">
                      {slide.badge}
                    </span>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-md">
                      {slide.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed drop-shadow-sm max-w-2xl">
                      {slide.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Indicadores em Bolinhas (Dots) */}
            <div className="absolute bottom-4 right-5 sm:bottom-6 sm:right-8 z-20 flex items-center gap-2">
              {SPACES_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${idx === currentSlide
                    ? "w-7 bg-cta shadow-[0_0_10px_rgba(233,69,96,0.8)]"
                    : "w-2 bg-white/40 hover:bg-white/70"
                    }`}
                  aria-label={`Ir para slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================= AS 4 SALAS DO COMPLEXO ================= */}
        <section id="experiencias" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-cta uppercase tracking-wider block">
              Complexo com 4 Salas
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              3 Categorias de Experiência em 4 Salas
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
              Conheça as três opções de salas do CineDoom, planejadas com capacidades e diferenciais pensados para cada tipo de sessão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Categoria 1: Salas 1 e 2 — CLÁSSICA */}
            <InteractiveGlowCard
              className="rounded-3xl liquid-glass-card border border-white/15 shadow-xl flex flex-col group hover:border-blue-400/40"
              contentClassName="flex flex-col h-full"
              orb1Color="rgba(59, 130, 246, 0.28)"
              orb2Color="rgba(99, 102, 241, 0.20)"
              spotlightColor="rgba(59, 130, 246, 0.12)"
            >
              <div className="p-6 sm:p-7 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* 1. Nome da experiência */}
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    CLÁSSICA
                  </h3>

                  {/* 2. Identificação das salas e capacidade */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                      Salas 1 e 2
                    </span>
                    <span className="text-xs font-bold text-blue-400">
                      120 Lugares
                    </span>
                  </div>

                  {/* 3. Descrição breve, em uma única frase */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Aproveite seus filmes favoritos em uma sala projetada para proporcionar conforto e uma ótima experiência audiovisual, com tela ampla, som de qualidade e poltronas espaçosas.
                  </p>
                </div>

                {/* 4. Lista de três características */}
                <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Tela ampla de alta definição</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Som de qualidade</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Armchair className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Poltronas confortáveis e espaçosas</span>
                  </div>
                </div>
              </div>
            </InteractiveGlowCard>

            {/* Categoria 2: Sala 3 — IMAX */}
            <InteractiveGlowCard
              className="rounded-3xl liquid-glass-card border border-white/15 shadow-xl flex flex-col group hover:border-cta/40"
              contentClassName="flex flex-col h-full"
              orb1Color="rgba(233, 69, 96, 0.32)"
              orb2Color="rgba(168, 85, 247, 0.22)"
              spotlightColor="rgba(233, 69, 96, 0.15)"
            >
              <div className="p-6 sm:p-7 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* 1. Nome da experiência */}
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    IMAX
                  </h3>

                  {/* 2. Identificação das salas e capacidade */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-cta text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                      Sala 3
                    </span>
                    <span className="text-xs font-bold text-cta">
                      120 Lugares
                    </span>
                  </div>

                  {/* 3. Descrição breve, em uma única frase */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Viva o cinema em outra escala, com imagens de alta nitidez, uma tela de grandes dimensões e som potente que envolve você em cada cena.
                  </p>
                </div>

                {/* 4. Lista de três características */}
                <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-cta shrink-0" />
                    <span>Imagens de alta nitidez</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cta shrink-0" />
                    <span>Som potente que envolve você</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cta shrink-0" />
                    <span>Tela de grandes dimensões para uma experiência imersiva.
                    </span>
                  </div>
                </div>
              </div>
            </InteractiveGlowCard>

            {/* Categoria 3: Sala 4 — VIP */}
            <InteractiveGlowCard
              className="rounded-3xl liquid-glass-card border border-white/15 shadow-xl flex flex-col group hover:border-amber-400/40"
              contentClassName="flex flex-col h-full"
              orb1Color="rgba(245, 158, 11, 0.30)"
              orb2Color="rgba(233, 69, 96, 0.20)"
              spotlightColor="rgba(245, 158, 11, 0.14)"
            >
              <div className="p-6 sm:p-7 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* 1. Nome da experiência */}
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    VIP
                  </h3>

                  {/* 2. Identificação das salas e capacidade */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold uppercase tracking-wider shadow-md">
                      Sala 4
                    </span>
                    <span className="text-xs font-bold text-amber-400">
                      60 Lugares
                    </span>
                  </div>

                  {/* 3. Descrição breve, em uma única frase */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Desfrute de uma sessão mais confortável em poltronas reclináveis, com mesas individuais para apoiar suas bebidas e petiscos. Um ambiente pensado para você relaxar e aproveitar o filme no seu próprio ritmo.
                  </p>
                </div>

                {/* 4. Lista de três características */}
                <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Armchair className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Poltronas reclináveis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Mesas individuais de apoio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Ambiente para relaxar no seu próprio ritmo</span>
                  </div>
                </div>
              </div>
            </InteractiveGlowCard>
          </div>
        </section>

        {/* ================= COMO FUNCIONA (EXPERIENCIA DESCOMPLICADA) ================= */}
        <InteractiveGlowCard
          as="section"
          className="p-8 sm:p-10 rounded-3xl liquid-glass-card border border-white/15 shadow-2xl"
          contentClassName="space-y-8"
          orb1Color="rgba(233, 69, 96, 0.16)"
          orb2Color="rgba(59, 130, 246, 0.12)"
          spotlightColor="rgba(255, 255, 255, 0.05)"
          orbSize="w-96 h-96"
        >
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-cta uppercase tracking-wider block">
              Sem Filas & Sem Taxas
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Como Funciona a Sua Visita ao CineDoom
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Passo 1 */}
            <InteractiveGlowCard
              className="p-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-cta/40 transition-all duration-300 group"
              contentClassName="space-y-3"
              orb1Color="rgba(233, 69, 96, 0.30)"
              orb2Color="rgba(147, 51, 234, 0.20)"
              spotlightColor="rgba(233, 69, 96, 0.12)"
              orbSize="w-56 h-56"
            >
              <div className="w-10 h-10 rounded-full bg-cta text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-cta/30 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Reserve seus assentos</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Escolha a sessão e seus lugares favoritos.
              </p>
            </InteractiveGlowCard>

            {/* Passo 2 */}
            <InteractiveGlowCard
              className="p-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-amber-400/40 transition-all duration-300 group"
              contentClassName="space-y-3"
              orb1Color="rgba(245, 158, 11, 0.30)"
              orb2Color="rgba(234, 88, 12, 0.20)"
              spotlightColor="rgba(245, 158, 11, 0.12)"
              orbSize="w-56 h-56"
            >
              <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center shadow-lg shadow-amber-400/30 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Chegue com tranquilidade</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Retire seus ingressos na bilheteria dentro do prazo informado.
              </p>
            </InteractiveGlowCard>

            {/* Passo 3 */}
            <InteractiveGlowCard
              className="p-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-emerald-400/40 transition-all duration-300 group"
              contentClassName="space-y-3"
              orb1Color="rgba(16, 185, 129, 0.30)"
              orb2Color="rgba(14, 165, 233, 0.20)"
              spotlightColor="rgba(16, 185, 129, 0.12)"
              orbSize="w-56 h-56"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center shadow-lg shadow-emerald-400/30 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Aproveite a experiência</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Compre sua pipoca e curta o filme.
              </p>
            </InteractiveGlowCard>
          </div>
        </InteractiveGlowCard>

        {/* ================= CHAMADA PARA AÇÃO (CTA) ================= */}
        <InteractiveGlowCard
          as="section"
          className="p-6 sm:p-10 md:p-12 rounded-3xl bg-gradient-to-r from-[#1A2238] via-[#16213E] to-[#12182B] border border-white/15 text-center shadow-2xl"
          contentClassName="space-y-4 sm:space-y-5"
          orb1Color="rgba(233, 69, 96, 0.35)"
          orb2Color="rgba(245, 158, 11, 0.25)"
          spotlightColor="rgba(255, 255, 255, 0.10)"
          orbSize="w-80 h-80"
        >
          <div className="max-w-xl mx-auto space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Pronto para Viver o Cinema de Verdade?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Confira os filmes em cartaz nas nossas 4 salas e reserve seus assentos favoritos.
            </p>
            <div className="pt-2">
              <Link
                href="/#programacao"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-full bg-cta hover:bg-cta-hover text-white text-xs sm:text-sm font-bold shadow-lg shadow-cta/30 hover:shadow-cta/40 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
              >
                <span>Ver Filmes e Programação em Cartaz</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </InteractiveGlowCard>
      </main>

      {/* ================= RODAPE OFICIAL ================= */}
      <CineDoomFooter />
    </div>
  );
}
