"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { HeroBillboard } from "@/components/home/hero-billboard";
import { FilmFilters } from "@/components/home/film-filters";
import { FilmCard } from "@/components/home/film-card";
import { FilmModal } from "@/components/home/film-modal";
import { InstitutionalBanner } from "@/components/home/institutional-banner";
import { AttendantSalesCounter } from "@/components/attendant/attendant-sales-counter";
import { abandonPreviousReservationIfDifferent } from "@/components/booking/reservation-lifecycle";
import { Pagination } from "@/components/ui/pagination";
import type { FilmItem } from "@/components/home/types";
import { Film } from "lucide-react";

export default function CinemarkStyleHomePage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const userRole = session?.user?.role;

  const [films, setFilms] = useState<FilmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedModalFilm, setSelectedModalFilm] = useState<FilmItem | null>(null);
  const [filmsPage, setFilmsPage] = useState<number>(1);

  // Redireciona Gerente para a área administrativa se acessar a raiz
  useEffect(() => {
    if (authStatus === "authenticated" && userRole === "GERENTE") {
      router.push("/gestao");
    }
  }, [authStatus, userRole, router]);

  // Carrega catálogo de filmes do cinema CineDoom
  useEffect(() => {
    async function loadFilms() {
      try {
        setLoading(true);
        const res = await fetch("/api/portal/filmes", { cache: "no-store" });
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

  // Abas de datas no estilo Cinemark para os 7 dias da semana a partir de hoje
  const dateTabs = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
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

  // Filtro de filmes por busca textual e data selecionada
  const filteredFilms = useMemo(() => {
    const targetDate = dateTabs[selectedDay]?.date;

    return films.filter((f) => {
      const matchesSearch =
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.synopsis && f.synopsis.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Se houver data selecionada, valida se o filme possui sessões naquele dia
      if (targetDate && f.sessions && f.sessions.length > 0) {
        const hasSessionOnTargetDate = f.sessions.some((s) => {
          const sDate = new Date(s.startsAt);
          return (
            sDate.getFullYear() === targetDate.getFullYear() &&
            sDate.getMonth() === targetDate.getMonth() &&
            sDate.getDate() === targetDate.getDate()
          );
        });
        if (!hasSessionOnTargetDate) return false;
      }

      return true;
    });
  }, [films, searchQuery, selectedDay, dateTabs]);

  // Se o usuário autenticado for ATENDENTE, exibe a interface operacional da Bilheteria.
  if (authStatus === "authenticated" && userRole === "ATENDENTE") {
    return (
      <div className="min-h-screen liquid-glass-backdrop text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
        <CineDoomHeader activePage="filmes" />
        <main className="w-full px-3 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col">
          <AttendantSalesCounter films={films} loading={loading} />
        </main>
        <CineDoomFooter simple className="mt-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen liquid-glass-backdrop text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* 1. Header CineDoom Liquid Glass */}
      <CineDoomHeader activePage="filmes" />

      {/* 2. Hero Billboard Cinematográfico */}
      <HeroBillboard
        films={films}
        heroIndex={heroIndex}
        onSelectHeroIndex={setHeroIndex}
        onOpenSessions={(f) => {
          abandonPreviousReservationIfDifferent(f.id);
          router.push(`/portal/reservas?filmeId=${f.id}&dia=${selectedDay}`);
        }}
        onOpenDetails={(f) => {
          setSelectedModalFilm(f);
        }}
      />

      {/* 3. Barra de Programação por Data & Filtros */}
      <FilmFilters
        dateTabs={dateTabs}
        selectedDay={selectedDay}
        onSelectDay={(day) => {
          setSelectedDay(day);
          setFilmsPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          setFilmsPage(1);
        }}
      />

      {/* 4. Galeria Compacta de Pôsteres de Cinema */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-10">
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Film className="w-6 h-6 text-cta" />
              Programação CineDoom
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique nos pôsteres ou em &quot;Ver sessões&quot; para conferir salas, horários e reservar
            </p>
          </div>
          <span className="liquid-glass-chip text-xs font-semibold text-slate-200">
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
              Tente selecionar outro dia na programação ou ajustar os termos de busca.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {filteredFilms
                .slice((filmsPage - 1) * 20, filmsPage * 20)
                .map((film) => (
                  <FilmCard
                    key={film.id}
                    film={film}
                    onOpenSessions={(f) => {
                      abandonPreviousReservationIfDifferent(f.id);
                      router.push(`/portal/reservas?filmeId=${f.id}&dia=${selectedDay}`);
                    }}
                    onOpenDetails={(f) => {
                      setSelectedModalFilm(f);
                    }}
                  />
                ))}
            </div>

            <Pagination
              currentPage={filmsPage}
              totalItems={filteredFilms.length}
              pageSize={20}
              onPageChange={setFilmsPage}
              itemLabel="filmes"
            />
          </div>
        )}

        {/* 5. Banner Institucional para a página Sobre o CineDoom */}
        <InstitutionalBanner />
      </main>

      {/* 6. Modal Interativo de Sinopse */}
      <FilmModal
        film={selectedModalFilm}
        onClose={() => setSelectedModalFilm(null)}
      />

      {/* 7. Footer Oficial CineDoom */}
      <CineDoomFooter />
    </div>
  );
}
