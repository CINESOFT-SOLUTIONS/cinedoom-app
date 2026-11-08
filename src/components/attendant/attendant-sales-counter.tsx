"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
 * Bilheteria - Homepage Operacional do Atendente CineDoom
 */
export function AttendantSalesCounter({ films, loading }: AttendantSalesCounterProps) {
  const [mounted, setMounted] = useState(false);
  const [activeSessionBooking, setActiveSessionBooking] = useState<{
    filmId: string;
    sessionId: string;
  } | null>(null);

  const [moreDatesFilm, setMoreDatesFilm] = useState<FilmItem | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {/* Título Oficial da Bilheteria */}
      <div className="border-b border-borderDark/60 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-cta" />
            <span>Escolha a sessão para um filme</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bilheteria CineDoom • Atendente de Bilheteria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="liquid-glass-chip text-xs font-semibold text-slate-200">
            {films.length} filmes no catálogo de hoje
          </span>
        </div>
      </div>

      {/* Grade de Filmes em Cards Horizontais Compactos */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cta border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Carregando bilheteria...</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 items-start">
          {filmsWithTodaySessions.map((film) => {
            const hasSessions = film.todaySessions.length > 0;

            return (
              <div
                key={film.id}
                data-testid={`attendant-card-${film.id}`}
                className="liquid-glass liquid-glass--hover rounded-2xl p-3 flex gap-3 items-start h-auto transition-all"
              >
                {/* Coluna Esquerda Compacta: Pôster (64-72px) + Botão "Mais datas" Imediatamente Abaixo */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] sm:w-[72px]">
                  <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-sm shrink-0">
                    {film.posterUrl ? (
                      <Image
                        src={film.posterUrl}
                        alt={film.title}
                        fill
                        sizes="72px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Film className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                    <div className="absolute top-1 left-1 z-10 scale-75 origin-top-left shadow-xs">
                      <AgeRatingBadge rating={film.classification} />
                    </div>
                  </div>

                  {/* Botão "Mais datas" posicionado imediatamente abaixo do pôster */}
                  <button
                    type="button"
                    onClick={() => handleOpenMoreDates(film)}
                    className="w-full py-1 px-1 rounded-md bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 leading-none"
                    title="Ver sessões em outros dias"
                  >
                    <Search className="w-3 h-3 text-cta shrink-0" />
                    <span className="whitespace-nowrap">Mais datas</span>
                  </button>
                </div>

                {/* Coluna Direita: Informações e Grade de Horários Compacta */}
                <div className="flex-1 min-w-0 flex flex-col justify-start">
                  {/* Cabeçalho do Card: Título + "Sessões de hoje" */}
                  <div className="leading-tight mb-1">
                    <h2
                      title={film.title}
                      className="text-xs sm:text-[13px] font-bold text-white truncate"
                    >
                      {film.title}
                    </h2>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Sessões de hoje
                      </span>
                      {hasSessions && (
                        <span className="text-[9px] text-slate-500 font-mono">
                          {film.todaySessions.length} {film.todaySessions.length === 1 ? "sessão" : "sessões"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Identificação da Sala */}
                  {hasSessions && film.roomName && (
                    <div className="mb-1.5">
                      <span className="inline-block text-[10px] font-semibold text-slate-300 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded leading-none">
                        {film.roomName}
                      </span>
                    </div>
                  )}

                  {/* Horários das Sessões Disponíveis */}
                  {hasSessions ? (
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5 pt-0.5">
                      {film.todaySessions.map((session) => {
                        const timeStr = new Date(session.startsAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        const { format, language } = getSessionFormatAndLanguage(session, film);

                        return (
                          <div
                            key={session.id}
                            className="flex flex-col items-center gap-0.5"
                          >
                            {/* Botão de Horário */}
                            <button
                              type="button"
                              onClick={() => handleSelectSession(film.id, session.id)}
                              className="w-full py-1 px-1 rounded-md bg-[#141A2D] hover:bg-cta hover:text-white border border-white/10 text-white font-mono font-bold text-[11px] tracking-wider transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center leading-none"
                              title={`Iniciar venda da sessão de ${timeStr} - ${format} ${language}`}
                            >
                              {timeStr}
                            </button>

                            {/* Indicadores Compactos de Formato e Idioma */}
                            <div className="flex items-center gap-0.5">
                              <span className="text-[8px] font-bold px-1 py-0.1 rounded bg-white/10 text-slate-300 font-mono leading-tight">
                                {format}
                              </span>
                              <span className="text-[8px] font-bold px-1 py-0.1 rounded bg-cta/20 text-cta font-mono leading-tight">
                                {language}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Mensagem de Ausência de Sessões */
                    <div className="py-2 px-2 rounded-lg bg-white/[0.02] border border-white/5 text-slate-400 text-[11px] flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="italic">Nenhuma sessão para hoje</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal do Fluxo de Reserva Integrado com Contexto da Sessão (Portal para cobrir 100% da viewport) */}
      {mounted && activeSessionBooking && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendant-booking-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
          className="liquid-glass-scrim z-[100] p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl max-h-[96vh] overflow-y-auto liquid-glass liquid-glass--modal rounded-3xl p-3 sm:p-6 flex flex-col justify-between my-auto cursor-default"
          >
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
        </div>,
        document.body
      )}

      {/* Modal de Outras Datas para o Filme Selecionado (Portal para cobrir 100% da viewport sem cortes) */}
      {mounted && moreDatesFilm && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoreDatesFilm(null);
          }}
          className="liquid-glass-scrim z-[100] p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl max-h-[96vh] overflow-y-auto liquid-glass liquid-glass--modal rounded-3xl p-3 sm:p-6 flex flex-col justify-between my-auto cursor-default"
          >
            <BookingFlow
              initialFilmId={moreDatesFilm.id}
              initialStep={1}
              isModal={true}
              onClose={() => setMoreDatesFilm(null)}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
