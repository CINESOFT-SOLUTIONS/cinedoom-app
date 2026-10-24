"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  Film,
  Calendar,
  Clock,
  Sparkles,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Search,
  User,
  LogIn,
  LogOut,
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
  originalTitle?: string;
  synopsis?: string;
  duration: number;
  classification?: string;
  genre?: string;
  posterUrl?: string;
  sessions: SessionItem[];
}

export default function PortalCatalogPage() {
  const { data: session } = useSession();
  const [films, setFilms] = useState<FilmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("TODOS");

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await fetch("/api/portal/filmes");
        if (res.ok) {
          const data = await res.json();
          setFilms(data);
        }
      } catch (err) {
        console.error("Erro ao carregar catalogo:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const genres = ["TODOS", ...Array.from(new Set(films.map((f) => f.genre).filter(Boolean)))];

  const filteredFilms = films.filter((film) => {
    const matchesSearch =
      film.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (film.synopsis && film.synopsis.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGenre = selectedGenre === "TODOS" || film.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="min-h-screen bg-[#0F0F1B] text-gray-100 flex flex-col font-sans selection:bg-[#E94560] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#16162A]/90 backdrop-blur-md border-b border-gray-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-lg shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E94560] to-[#533483] flex items-center justify-center shadow-lg shadow-[#E94560]/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-white">CINEDOOM</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E94560]/20 text-[#E94560] border border-[#E94560]/30 uppercase tracking-widest">
                Portal
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Ingressos e Reservas Online com Garantia ACID</p>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href="/portal"
            className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#E94560]/20 text-[#E94560] border border-[#E94560]/40 transition-colors"
          >
            Programação
          </Link>
          {session?.user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/portal/minhas-reservas"
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#1F1F35] hover:bg-[#282846] text-gray-200 border border-gray-700/60 transition-all hover:border-gray-500"
              >
                <Ticket className="w-3.5 h-3.5 text-[#E94560]" />
                Minhas Reservas
              </Link>
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-white">{session.user.name}</span>
                <span className="text-[10px] text-gray-400">{session.user.email}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-300 hover:text-white transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Entrar
              </Link>
              <Link
                href="/portal/cadastro"
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-[#E94560] to-[#d63d56] text-white shadow-md shadow-[#E94560]/20 hover:brightness-110 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                Criar Conta
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1A1A32] to-[#0F0F1B] border-b border-gray-800/60 px-4 lg:px-8 py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(233,69,96,0.12),transparent_50%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E94560]/10 border border-[#E94560]/20 text-[#E94560] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Experiência Cinematográfica Premium
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Reserve seu lugar nos maiores lançamentos do cinema
          </h1>
          <p className="text-sm md:text-base text-gray-400 max-w-2xl leading-relaxed">
            Escolha seu filme favorito, selecione seus assentos no mapa interativo em tempo real e retire seus ingressos com antecedência de forma prática e segura.
          </p>

          {/* Search & Filters */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por título ou sinopse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#16162A]/90 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E94560] focus:ring-1 focus:ring-[#E94560] transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {genres.slice(0, 5).map((genre) => (
                <button
                  key={genre || "indefinido"}
                  onClick={() => setSelectedGenre(genre || "TODOS")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedGenre === (genre || "TODOS")
                      ? "bg-[#E94560] text-white shadow-md shadow-[#E94560]/30"
                      : "bg-[#1A1A2E] text-gray-400 hover:text-white border border-gray-800"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Movie Catalog Grid */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#E94560]" />
            <h2 className="text-xl font-black text-white">Filmes em Cartaz</h2>
          </div>
          <span className="text-xs text-gray-400">
            {filteredFilms.length} {filteredFilms.length === 1 ? "filme encontrado" : "filmes encontrados"}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Carregando programação do cinema...</p>
          </div>
        ) : filteredFilms.length === 0 ? (
          <div className="py-16 text-center bg-[#16162A]/50 border border-gray-800/80 rounded-2xl p-8 space-y-3">
            <Film className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhum filme disponível no momento</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Não encontramos filmes para os filtros selecionados. Tente ajustar o termo de busca ou volte mais tarde.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFilms.map((film) => (
              <div
                key={film.id}
                className="group bg-[#16162A]/90 hover:bg-[#1C1C36] border border-gray-800/80 hover:border-gray-700/80 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Poster / Header */}
                <div className="relative aspect-video w-full bg-[#20203A] overflow-hidden">
                  {film.posterUrl ? (
                    <Image
                      src={film.posterUrl}
                      alt={film.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E1E38] to-[#121224] text-gray-600">
                      <Film className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#16162A] via-transparent to-black/40" />

                  <div className="absolute top-3 left-3 flex gap-2">
                    {film.classification && (
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-black text-amber-300 border border-amber-500/30 uppercase">
                        {film.classification}
                      </span>
                    )}
                    {film.duration && (
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-gray-300 flex items-center gap-1 border border-white/10">
                        <Clock className="w-3 h-3 text-[#E94560]" />
                        {film.duration} min
                      </span>
                    )}
                  </div>
                </div>

                {/* Film Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-black text-lg text-white group-hover:text-[#E94560] transition-colors leading-snug">
                      {film.title}
                    </h3>
                    {film.genre && (
                      <p className="text-[11px] font-bold text-[#E94560] uppercase tracking-wide">
                        {film.genre}
                      </p>
                    )}
                    {film.synopsis && (
                      <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                        {film.synopsis}
                      </p>
                    )}
                  </div>

                  {/* Sessions Section */}
                  <div className="pt-3 border-t border-gray-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-bold flex items-center gap-1 text-gray-300">
                        <Calendar className="w-3.5 h-3.5 text-[#E94560]" />
                        Próximas Sessões:
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {film.sessions.length} horários
                      </span>
                    </div>

                    {film.sessions.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-1">Nenhuma sessão disponível para hoje.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {film.sessions.map((session) => {
                          const date = new Date(session.startsAt);
                          const timeStr = date.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <Link
                              key={session.id}
                              href={`/portal/sessoes/${session.id}`}
                              className="px-3 py-1.5 rounded-xl bg-[#22223D] hover:bg-[#E94560] border border-gray-700/60 hover:border-[#E94560] text-gray-200 hover:text-white transition-all duration-200 text-xs flex items-center gap-1.5 group/btn shadow-sm"
                            >
                              <span className="font-bold font-mono">{timeStr}</span>
                              <span className="text-[10px] text-gray-400 group-hover/btn:text-white/80">
                                ({session.room.name})
                              </span>
                              <ChevronRight className="w-3 h-3 text-gray-500 group-hover/btn:text-white transition-transform group-hover/btn:translate-x-0.5" />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#121222] border-t border-gray-800/80 px-4 lg:px-8 py-8 mt-12 text-center text-xs text-gray-400 space-y-2">
        <div className="flex items-center justify-center gap-2 font-bold text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>CineDoom - Plataforma Multi-Tenant com Isolamento Rigoroso e Consistência ACID</span>
        </div>
        <p className="text-gray-500 text-[11px]">
          Conformidade com a LGPD (Lei nº 13.709/2018) e Norma ABNT NBR ISO/IEC/IEEE 12207:2021.
        </p>
      </footer>
    </div>
  );
}
