"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  Film,
  Calendar,
  Clock,
  Ticket,
  Search,
  Sparkles,
  ShieldCheck,
  User,
  LogIn,
  Tv,
  CheckCircle2,
  Play,
  X,
  MapPin,
} from "lucide-react";

interface SessionItem {
  id: string;
  startsAt: string;
  price: number;
  status: string;
  room: {
    id: string;
    name: string;
    capacity: number;
  };
}

interface FilmItem {
  id: string;
  title: string;
  director?: string;
  synopsis?: string;
  duration: number;
  classification?: string;
  genre?: string;
  posterUrl?: string;
  sessions: SessionItem[];
}

const GENRE_MAP: Record<string, string> = {
  "Duna: Parte Dois": "Ficção Científica • Aventura",
  "Oppenheimer": "Drama Histórico • Biografia",
  "Vingadores: Ultimato": "Ação • Ficção Científica",
  "Divertida Mente 2": "Animação • Família",
};

function AgeRatingBadge({ rating }: { rating?: string }) {
  const r = (rating || "L").toUpperCase();

  if (r === "L" || r === "LIVRE") {
    return (
      <span
        title="Classificação Livre para todos os públicos"
        className="w-6 h-6 rounded bg-[#00A859] text-white font-black text-xs flex items-center justify-center shadow-md select-none"
      >
        L
      </span>
    );
  }
  if (r === "10") {
    return (
      <span
        title="Não recomendado para menores de 10 anos"
        className="w-6 h-6 rounded bg-[#0099DA] text-white font-black text-xs flex items-center justify-center shadow-md select-none"
      >
        10
      </span>
    );
  }
  if (r === "12") {
    return (
      <span
        title="Não recomendado para menores de 12 anos"
        className="w-6 h-6 rounded bg-[#F7B500] text-neutral-900 font-black text-xs flex items-center justify-center shadow-md select-none"
      >
        12
      </span>
    );
  }
  if (r === "14") {
    return (
      <span
        title="Não recomendado para menores de 14 anos"
        className="w-6 h-6 rounded bg-[#F37021] text-white font-black text-xs flex items-center justify-center shadow-md select-none"
      >
        14
      </span>
    );
  }
  if (r === "16") {
    return (
      <span
        title="Não recomendado para menores de 16 anos"
        className="w-6 h-6 rounded bg-[#E94560] text-white font-black text-xs flex items-center justify-center shadow-md select-none"
      >
        16
      </span>
    );
  }
  return (
    <span
      title="Não recomendado para menores de 18 anos"
      className="w-6 h-6 rounded bg-[#1C1C1C] border border-slate-600 text-white font-black text-xs flex items-center justify-center shadow-md select-none"
    >
      18
    </span>
  );
}

export default function CinemarkStyleHomePage() {
  const { data: session } = useSession();

  const [films, setFilms] = useState<FilmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("TODOS");
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [trailerModalFilm, setTrailerModalFilm] = useState<FilmItem | null>(null);

  // Carrega catálogo público do cinema CineDoom
  useEffect(() => {
    async function loadFilms() {
      try {
        setLoading(true);
        const res = await fetch("/api/portal/filmes");
        if (res.ok) {
          const data = await res.json();
          setFilms(data);
        }
      } catch (err) {
        console.error("Erro ao carregar filmes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFilms();
  }, []);

  // Rotação suave do Hero Billboard
  useEffect(() => {
    if (films.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % films.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [films.length]);

  const activeHeroFilm = films[heroIndex] || films[0];

  // Abas de datas no estilo Cinemark
  const dateTabs = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName =
        i === 0
          ? "Hoje"
          : i === 1
          ? "Amanhã"
          : d.toLocaleDateString("pt-BR", { weekday: "short" });
      const dayNumber = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return {
        index: i,
        dayName: dayName.replace(".", "").toUpperCase(),
        dayNumber,
        date: d,
      };
    });
  }, []);

  // Filtro de filmes
  const filteredFilms = useMemo(() => {
    return films.filter((f) => {
      const matchesSearch =
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.synopsis && f.synopsis.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedFormat === "IMAX") {
        const hasImax = f.sessions.some((s) =>
          s.room.name.toLowerCase().includes("imax")
        );
        if (!hasImax) return false;
      } else if (selectedFormat === "VIP") {
        const hasVip = f.sessions.some((s) =>
          s.room.name.toLowerCase().includes("vip")
        );
        if (!hasVip) return false;
      }

      return true;
    });
  }, [films, searchQuery, selectedFormat]);

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* 1. Header CineDoom (Estrutura Inspirada no Cinemark) */}
      <header className="sticky top-0 z-50 bg-[#141A2D]/95 backdrop-blur-md border-b border-borderDark/60 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logotipo da Unidade CineDoom */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cta to-[#892CDC] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-cta/25 group-hover:scale-105 transition-transform">
                  CD
                </div>
                <div className="leading-tight">
                  <span className="font-black text-xl tracking-wider text-white flex items-center gap-1.5">
                    CINEDOOM
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Cinema & Bilheteria
                  </span>
                </div>
              </Link>
            </div>

            {/* Links de Navegação e Ações */}
            <nav className="flex items-center gap-3 md:gap-5">
              <a
                href="#programacao"
                className="hidden sm:inline-flex text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-colors"
              >
                Programação
              </a>
              <a
                href="#salas"
                className="hidden md:inline-flex text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-colors"
              >
                Salas
              </a>

              <Link
                href="/portal/minhas-reservas"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface/60 hover:bg-surface text-slate-300 hover:text-white border border-borderDark/60 text-xs font-semibold transition-all"
              >
                <Ticket className="w-4 h-4 text-cta" />
                <span className="hidden sm:inline">Minhas Reservas</span>
              </Link>

              {session?.user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-borderDark">
                  <div className="w-8 h-8 rounded-full bg-cta/20 border border-cta/40 text-cta flex items-center justify-center font-bold text-xs">
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                  <div className="hidden xl:block text-left text-xs leading-none">
                    <span className="font-bold text-white block">{session.user.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {session.user.role || "Cliente"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Entrar</span>
                  </Link>
                  <Link
                    href="/portal/cadastro"
                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-black shadow-lg shadow-cta/25 hover:brightness-110 transition-all"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Cadastrar</span>
                  </Link>
                </div>
              )}

              {/* Acesso Restrito da Equipe */}
              <Link
                href="/auth/login"
                title="Acesso da Equipe (Bilheteria / Gestão)"
                className="p-2 rounded-xl bg-surface/30 hover:bg-surface text-slate-400 hover:text-slate-200 border border-borderDark/40 transition-colors"
              >
                <Tv className="w-4 h-4" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 2. Hero Billboard Cinematográfico */}
      <section className="relative w-full bg-[#0B0F1C] overflow-hidden min-h-[460px] md:min-h-[560px] flex items-center">
        {activeHeroFilm?.posterUrl ? (
          <div className="absolute inset-0">
            <Image
              src={activeHeroFilm.posterUrl}
              alt={activeHeroFilm.title}
              fill
              className="object-cover object-top opacity-25 md:opacity-35 scale-105 blur-sm md:blur-none transition-all duration-700"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F1C] via-[#0B0F1C]/90 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1C] via-transparent to-black/30" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-darkBg to-[#0B0F1C]" />
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
          <div className="max-w-2xl space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded bg-cta text-white font-black text-[11px] tracking-wider uppercase shadow-md shadow-cta/30">
                Em Destaque
              </span>
              <span className="px-2.5 py-1 rounded bg-surface/90 border border-borderDark text-amber-300 font-bold text-[11px] tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Sala 1 IMAX
              </span>
              <AgeRatingBadge rating={activeHeroFilm?.classification} />
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none drop-shadow-xl">
              {activeHeroFilm?.title || "Duna: Parte Dois"}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300">
              {activeHeroFilm?.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cta" />
                  {activeHeroFilm.duration} minutos
                </span>
              )}
              <span className="text-slate-400 border-l border-borderDark pl-3">
                {GENRE_MAP[activeHeroFilm?.title || ""] || "Filme em Cartaz"}
              </span>
              {activeHeroFilm?.director && (
                <span className="text-slate-400 border-l border-borderDark pl-3 hidden sm:inline">
                  Direção: {activeHeroFilm.director}
                </span>
              )}
            </div>

            <p className="text-sm md:text-base text-slate-300/90 leading-relaxed line-clamp-3 max-w-xl">
              {activeHeroFilm?.synopsis ||
                "Consulte a programação do CineDoom, selecione suas poltronas no mapa interativo e reserve seus ingressos com confirmação atômica ACID."}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <a
                href="#programacao"
                className="px-6 py-3.5 rounded-xl bg-cta hover:bg-cta-hover text-white font-black text-sm shadow-xl shadow-cta/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                <span>Ver Sessões & Reservar</span>
              </a>

              {activeHeroFilm && (
                <button
                  type="button"
                  onClick={() => setTrailerModalFilm(activeHeroFilm)}
                  className="px-5 py-3.5 rounded-xl bg-surface/80 hover:bg-surface border border-borderDark text-white font-bold text-sm transition-all hover:border-slate-400 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 text-cta fill-cta" />
                  <span>Ver Detalhes</span>
                </button>
              )}

              {activeHeroFilm?.sessions?.[0] && (
                <Link
                  href={`/portal/sessoes/${activeHeroFilm.sessions[0].id}`}
                  className="px-4 py-3.5 rounded-xl bg-[#141A2D] hover:bg-surface border border-borderDark text-emerald-400 font-bold text-xs transition-all hidden sm:inline-flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Próxima Sessão (
                  {new Date(activeHeroFilm.sessions[0].startsAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  )
                </Link>
              )}
            </div>
          </div>

          {films.length > 1 && (
            <div className="pt-10 flex items-center gap-2">
              {films.map((f, idx) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHeroIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    heroIndex === idx
                      ? "w-8 bg-cta shadow-md shadow-cta/50"
                      : "w-2.5 bg-slate-600 hover:bg-slate-400"
                  }`}
                  aria-label={`Ver destaque ${f.title}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Barra de Programação por Data & Filtros */}
      <section
        id="programacao"
        className="sticky top-16 md:top-20 z-40 bg-[#12182B]/95 backdrop-blur-md border-b border-borderDark/80 shadow-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Seletor de Datas em Pílulas */}
            <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 hidden sm:flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-cta" /> Data:
              </span>
              {dateTabs.map((tab) => (
                <button
                  key={tab.index}
                  type="button"
                  onClick={() => setSelectedDay(tab.index)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex flex-col items-center leading-tight ${
                    selectedDay === tab.index
                      ? "bg-cta text-white shadow-lg shadow-cta/30"
                      : "bg-surface/50 text-slate-400 hover:text-white hover:bg-surface border border-borderDark/50"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider">{tab.dayName}</span>
                  <span className="text-xs font-black">{tab.dayNumber}</span>
                </button>
              ))}
            </div>

            {/* Filtros de Formatos & Busca */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex items-center gap-1.5 text-xs">
                {["TODOS", "IMAX", "VIP"].map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setSelectedFormat(format)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                      selectedFormat === format
                        ? "bg-surface text-cta border border-cta/50 shadow-sm"
                        : "text-slate-400 hover:text-white bg-transparent"
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar filme em cartaz..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface/70 border border-borderDark rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cta transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Grade de Filmes & Sessões Agrupadas por Sala */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-10">
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Film className="w-6 h-6 text-cta" />
              Programação CineDoom
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique no horário para selecionar suas poltronas na tela interativa
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface border border-borderDark text-slate-300">
            {filteredFilms.length} filmes em exibição
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-cta border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Carregando programação do cinema...</p>
          </div>
        ) : filteredFilms.length === 0 ? (
          <div className="py-20 text-center bg-surface/40 border border-borderDark rounded-2xl p-8 space-y-3">
            <Film className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhum filme encontrado</h3>
            <p className="text-xs text-slate-400">
              Tente selecionar outro formato de sala ou ajustar os termos de busca.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredFilms.map((film) => {
              const sessionsByRoom = film.sessions.reduce<Record<string, SessionItem[]>>(
                (acc, s) => {
                  const roomName = s.room.name;
                  if (!acc[roomName]) acc[roomName] = [];
                  acc[roomName].push(s);
                  return acc;
                },
                {}
              );

              const genreText =
                GENRE_MAP[film.title] || film.genre || "Filme em Cartaz";

              return (
                <div
                  key={film.id}
                  className="bg-surface/60 hover:bg-surface/90 border border-borderDark/80 rounded-2xl p-5 md:p-6 shadow-xl transition-all grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
                >
                  {/* Poster 2:3 */}
                  <div className="md:col-span-3 lg:col-span-2 relative aspect-[2/3] w-full max-w-[170px] mx-auto md:mx-0 rounded-xl overflow-hidden bg-black/40 shadow-lg group">
                    {film.posterUrl ? (
                      <Image
                        src={film.posterUrl}
                        alt={film.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Film className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      <AgeRatingBadge rating={film.classification} />
                    </div>
                  </div>

                  {/* Informações do Filme & Sessões */}
                  <div className="md:col-span-9 lg:col-span-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                          {film.title}
                        </h3>
                        <span className="text-[11px] font-bold text-cta uppercase tracking-wider px-2 py-0.5 rounded bg-cta/10">
                          {genreText.split("•")[0]?.trim()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                        {film.duration && <span>{film.duration} min</span>}
                        <span>• {genreText}</span>
                        {film.director && <span>• Direção: {film.director}</span>}
                      </div>

                      {film.synopsis && (
                        <p className="text-xs text-slate-300/80 leading-relaxed line-clamp-2 max-w-3xl">
                          {film.synopsis}
                        </p>
                      )}
                    </div>

                    {/* Sessões Agrupadas por Sala */}
                    <div className="pt-4 border-t border-borderDark/60 space-y-4">
                      {Object.keys(sessionsByRoom).length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-1">
                          Nenhuma sessão programada para este filme na data selecionada.
                        </div>
                      ) : (
                        Object.entries(sessionsByRoom).map(([roomName, roomSessions]) => {
                          return (
                            <div key={roomName} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white uppercase tracking-wider">
                                  {roomName}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2.5">
                                {roomSessions.map((sess) => {
                                  const time = new Date(sess.startsAt).toLocaleTimeString(
                                    "pt-BR",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  );

                                  return (
                                    <Link
                                      key={sess.id}
                                      href={`/portal/sessoes/${sess.id}`}
                                      className="group/pill flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-[#141A2D] hover:bg-cta border border-borderDark hover:border-cta text-slate-200 hover:text-white transition-all shadow-md hover:scale-[1.03] active:scale-[0.98]"
                                    >
                                      <span className="font-mono font-black text-sm block leading-none">
                                        {time}
                                      </span>
                                      <span className="text-[10px] font-bold text-emerald-400 group-hover/pill:text-white mt-1">
                                        R$ {sess.price.toFixed(2)}
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. Seção de Salas do CineDoom */}
        <section id="salas" className="pt-12 border-t border-borderDark/60 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <h3 className="text-2xl font-black text-white tracking-tight">
              Salas do CineDoom
            </h3>
            <p className="text-xs text-slate-400">
              Ambientes projetados para conforto e fidelidade de imagem e som.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1A2238] to-[#12182B] border border-borderDark shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-cta/15 text-cta flex items-center justify-center font-black text-lg">
                  IMAX
                </div>
                <span className="text-[11px] font-bold text-cta bg-cta/10 px-2.5 py-1 rounded-full uppercase">
                  50 Lugares
                </span>
              </div>
              <h4 className="text-lg font-black text-white">Sala 1 • IMAX</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tela de grande formato com projeção de alta definição e sistema de som imersivo.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-borderDark/60">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cta" /> Disposição de poltronas em declive
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cta" /> Áudio digital surround multicanal
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1A2238] to-[#12182B] border border-borderDark shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-black text-lg">
                  VIP
                </div>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase">
                  40 Lugares
                </span>
              </div>
              <h4 className="text-lg font-black text-white">Sala 2 • VIP</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ambiente intimista com poltronas reclináveis e maior espaçamento entre fileiras.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-borderDark/60">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Poltronas com maior reclinação e conforto
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Espaçamento ampliado para circulação
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Modal de Detalhes do Filme */}
      {trailerModalFilm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1A2238] border border-borderDark rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setTrailerModalFilm(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-surface hover:bg-surface/80 text-slate-400 hover:text-white"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <AgeRatingBadge rating={trailerModalFilm.classification} />
              <h4 className="text-lg font-black text-white">{trailerModalFilm.title}</h4>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <div>
                <strong>Duração:</strong> {trailerModalFilm.duration} minutos
              </div>
              <div>
                <strong>Gênero:</strong> {GENRE_MAP[trailerModalFilm.title] || trailerModalFilm.genre}
              </div>
              {trailerModalFilm.director && (
                <div>
                  <strong>Direção:</strong> {trailerModalFilm.director}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {trailerModalFilm.synopsis || "Sem sinopse disponível no momento."}
            </p>

            <div className="pt-3 border-t border-borderDark flex justify-end">
              <a
                href="#programacao"
                onClick={() => setTrailerModalFilm(null)}
                className="px-4 py-2 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold transition-all"
              >
                Ver Horários Disponíveis
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 6. Footer Oficial CineDoom Conforme Especificação */}
      <footer className="bg-[#0B0F1C] border-t border-borderDark/80 pt-12 pb-8 mt-16 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cta flex items-center justify-center font-black text-white text-sm">
                  CD
                </div>
                <span className="font-black text-base text-white tracking-wider">
                  CINEDOOM
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cinema com reserva online e pagamento presencial na bilheteria física.
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="font-bold text-white text-xs uppercase tracking-wider block">
                Bilheteria & Reservas Presenciais
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                As reservas realizadas no portal garantem seus assentos até 1 hora antes do início da sessão. O pagamento e a emissão dos ingressos físicos são realizados diretamente no balcão da bilheteria.
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="font-bold text-white text-xs uppercase tracking-wider block">
                Segurança & Conformidade
              </span>
              <p className="text-xs text-slate-400 leading-relaxed flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Dados protegidos em conformidade com a LGPD (Lei nº 13.709/2018).
              </p>
              <p className="text-[11px] text-slate-500">
                Reserva com trava transacional ACID e expiração automática de assentos.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-borderDark/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 CineDoom. Todos os direitos reservados.</p>
            <p>Desenvolvido por CineSoft Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
