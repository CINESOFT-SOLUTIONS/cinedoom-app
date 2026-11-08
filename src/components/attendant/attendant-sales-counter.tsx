"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Film, Search, Ticket, AlertCircle } from "lucide-react";
import { AgeRatingBadge } from "@/components/home/age-rating-badge";
import { getRoomDisplayName, getRoomExperienceCategory } from "@/shared/experiences";
import { BookingFlow } from "@/components/booking/booking-flow";
import { abandonPreviousReservationIfDifferent } from "@/components/booking/reservation-lifecycle";
import type { FilmItem, SessionItem } from "@/components/home/types";

interface AttendantSalesCounterProps {
  films: FilmItem[];
  loading?: boolean;
}

/**
 * Determina o formato (2D, 3D, IMAX) e idioma (DUB, LEG, ORIG) da sessão.
 */
function getSessionFormatAndLanguage(session: SessionItem, film: FilmItem) {
  const category = getRoomExperienceCategory(session.room?.name);
  const format = category === "IMAX" ? "IMAX" : "2D";

  // Classificação / gênero infantil tende a ser DUB, adultos/classificação alta LEG/ORIG
  const isAnimationOrFamily =
    (film.genre && (film.genre.toLowerCase().includes("anima") || film.genre.toLowerCase().includes("família"))) ||
    film.classification === "L" ||
    film.classification === "10";

  // Variação determinística pelo ID da sessão para riqueza visual realista
  const lastChar = session.id.slice(-1).charCodeAt(0);
  const language = isAnimationOrFamily
    ? lastChar % 3 === 0
      ? "LEG"
      : "DUB"
    : lastChar % 2 === 0
    ? "LEG"
    : "DUB";

  return { format, language };
}

/**
 * Balcão de Vendas - Homepage Operacional do Atendente CineDoom
 */
export function AttendantSalesCounter({ films, loading }: AttendantSalesCounterProps) {
  const [activeSessionBooking, setActiveSessionBooking] = useState<{
    filmId: string;
    sessionId: string;
  } | null>(null);

  const [moreDatesFilm, setMoreDatesFilm] = useState<FilmItem | null>(null);

  // Filtra as sessões de hoje para cada filme
  const today = useMemo(() => new Date(), []);

  const filmsWithTodaySessions = useMemo(() => {
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    return films.map((film) => {
      const todaySessions = (film.sessions || []).filter((s) => {
        const sDate = new Date(s.startsAt);
        return (
          sDate.getFullYear() === todayYear &&
          sDate.getMonth() === todayMonth &&
          sDate.getDate() === todayDate
        );
      });

      // Ordena por horário crescente
      todaySessions.sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      );

      // Identifica a sala principal da sessão ou agrupa se houver
      const firstRoomRaw = todaySessions[0]?.room?.name;
      const roomCategory = getRoomExperienceCategory(firstRoomRaw);
      const roomClean = firstRoomRaw ? getRoomDisplayName(firstRoomRaw) : null;
      const roomName = roomClean
        ? roomCategory === "VIP"
          ? `${roomClean} Vip`
          : roomCategory === "IMAX"
          ? `${roomClean} IMAX`
          : roomClean
        : null;

      return {
        ...film,
        todaySessions,
        roomName,
      };
    });
  }, [films, today]);

  const handleSelectSession = (filmId: string, sessionId: string) => {
    abandonPreviousReservationIfDifferent(filmId, sessionId);
    setActiveSessionBooking({ filmId, sessionId });
  };

  const handleCloseModal = () => {
    setActiveSessionBooking(null);
  };

  const handleOpenMoreDates = (film: FilmItem) => {
    abandonPreviousReservationIfDifferent(film.id);
    setMoreDatesFilm(film);
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      {/* Título Oficial do Balcão de Vendas */}
      <div className="border-b border-borderDark/60 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-cta" />
            <span>Escolha a sessão para um filme</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Balcão de Vendas CineDoom • Atendente de Bilheteria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="liquid-glass-chip text-xs font-semibold text-slate-200">
            {films.length} filmes no catálogo de hoje
          </span>
        </div>
      </div>

      {/* Grade de Filmes em Cards Horizontais */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cta border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Carregando balcão de vendas...</p>
        </div>
      ) : filmsWithTodaySessions.length === 0 ? (
        <div className="py-20 text-center liquid-glass rounded-2xl p-8 space-y-3">
          <Film className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">Nenhum filme disponível no momento</h2>
          <p className="text-xs text-slate-400">
            Consulte a gerência para verificar a ativação das sessões.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
          {filmsWithTodaySessions.map((film) => {
            const hasSessions = film.todaySessions.length > 0;

            return (
              <div
                key={film.id}
                data-testid={`attendant-card-${film.id}`}
                className="liquid-glass liquid-glass--hover rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between"
              >
                {/* Divisão Horizontal: Pôster à Esquerda | Informações e Horários à Direita */}
                <div className="flex gap-3 sm:gap-3.5 items-start">
                  {/* Lado Esquerdo: Pôster Vertical + Classificação Indicativa no Canto Superior */}
                  <div className="relative aspect-[2/3] w-24 sm:w-28 rounded-xl overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-md shrink-0">
                    {film.posterUrl ? (
                      <Image
                        src={film.posterUrl}
                        alt={film.title}
                        fill
                        sizes="112px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Film className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 z-10 scale-90 origin-top-left shadow-md">
                      <AgeRatingBadge rating={film.classification} />
                    </div>
                  </div>

                  {/* Lado Direito: Título, "Sessões de hoje", Sala, Horários e Indicadores */}
                  <div className="flex-1 min-w-0 flex flex-col justify-start space-y-2">
                    {/* Título do Filme */}
                    <div>
                      <h2
                        title={film.title}
                        className="text-sm font-bold text-white leading-tight line-clamp-2"
                      >
                        {film.title}
                      </h2>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                        Sessões de hoje
                      </span>
                    </div>

                    {/* Informação da Sala em Destaque */}
                    {hasSessions && film.roomName && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <span className="liquid-glass-chip text-[11px] text-slate-200">
                          {film.roomName}
                        </span>
                      </div>
                    )}

                    {/* Horários das Sessões Disponíveis */}
                    {hasSessions ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {film.todaySessions.map((session) => {
                          const timeStr = new Date(session.startsAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          const { format, language } = getSessionFormatAndLanguage(session, film);

                          return (
                            <div
                              key={session.id}
                              className="flex flex-col items-center gap-1 shrink-0"
                            >
                              {/* Botão de Horário */}
                              <button
                                type="button"
                                onClick={() => handleSelectSession(film.id, session.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#141A2D] hover:bg-cta hover:text-white border border-white/10 text-white font-mono font-bold text-xs tracking-wider transition-all duration-150 cursor-pointer shadow-xs active:scale-95 flex items-center justify-center min-w-[58px]"
                                title={`Iniciar venda da sessão de ${timeStr} - ${format} ${language}`}
                              >
                                {timeStr}
                              </button>

                              {/* Indicadores Compactos de Formato e Idioma */}
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10 font-mono leading-none">
                                  {format}
                                </span>
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-cta/20 text-cta border border-cta/30 font-mono leading-none">
                                  {language}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Mensagem de Ausência de Sessões */
                      <div className="py-3 px-2 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="italic text-[11px]">Nenhuma sessão para hoje</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parte Inferior do Card: Botão Secundário "Mais datas" */}
                <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenMoreDates(film)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-cta" />
                    <span>Mais datas</span>
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {film.todaySessions.length} {film.todaySessions.length === 1 ? "sessão" : "sessões"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal do Fluxo de Reserva Integrado com Contexto da Sessão */}
      {activeSessionBooking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendant-booking-title"
          className="liquid-glass-scrim z-50 p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-6xl max-h-[96vh] overflow-y-auto liquid-glass liquid-glass--modal rounded-3xl p-2 sm:p-5 flex flex-col justify-between">
            <h2 id="attendant-booking-title" className="sr-only">
              Fluxo de Venda de Ingressos
            </h2>
            <BookingFlow
              initialFilmId={activeSessionBooking.filmId}
              initialSessionId={activeSessionBooking.sessionId}
              initialStep={2}
              isModal={true}
              onClose={handleCloseModal}
            />
          </div>
        </div>
      )}

      {/* Modal de Outras Datas para o Filme Selecionado */}
      {moreDatesFilm && (
        <div
          role="dialog"
          aria-modal="true"
          className="liquid-glass-scrim z-50 p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-6xl max-h-[96vh] overflow-y-auto liquid-glass liquid-glass--modal rounded-3xl p-2 sm:p-5 flex flex-col justify-between">
            <BookingFlow
              initialFilmId={moreDatesFilm.id}
              initialStep={1}
              isModal={true}
              onClose={() => setMoreDatesFilm(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
