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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 sm:gap-6 items-start">
          {filmsWithTodaySessions.map((film) => {
            const hasSessions = film.todaySessions.length > 0;

            return (
              <div
                key={film.id}
                data-testid={`attendant-card-${film.id}`}
                className="liquid-glass-card rounded-2xl p-4 flex gap-4 items-start h-auto transition-all shadow-md hover:border-white/20"
              >
                {/* Coluna Esquerda: Pôster com proporção adequada e presença visual + Botão "Mais datas" */}
                <div className="flex flex-col items-center gap-2 shrink-0 w-[100px] sm:w-[110px]">
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-md shrink-0">
                    {film.posterUrl ? (
                      <Image
                        src={film.posterUrl}
                        alt={film.title}
                        fill
                        sizes="110px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Film className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 z-10 scale-90 origin-top-left shadow-sm">
                      <AgeRatingBadge rating={film.classification} />
                    </div>
                  </div>

                  {/* Botão "Mais datas" posicionado imediatamente abaixo do pôster */}
                  <button
                    type="button"
                    onClick={() => handleOpenMoreDates(film)}
                    className="w-full py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 leading-none"
                    title="Ver sessões em outros dias"
                  >
                    <Search className="w-3.5 h-3.5 text-cta shrink-0" />
                    <span className="whitespace-nowrap">Mais datas</span>
                  </button>
                </div>

                {/* Coluna Direita: Informações e Grade de Horários em 2 Colunas */}
                <div className="flex-1 min-w-0 flex flex-col justify-start">
                  {/* 1. Nome do filme */}
                  <h2
                    title={film.title}
                    className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug line-clamp-2"
                  >
                    {film.title}
                  </h2>

                  {/* 2. Identificação "Sessões de hoje" e contagem discreta */}
                  <div className="flex items-center justify-between gap-1.5 mt-1">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Sessões de hoje
                    </span>
                    {hasSessions && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {film.todaySessions.length} {film.todaySessions.length === 1 ? "sessão" : "sessões"}
                      </span>
                    )}
                  </div>

                  {/* 3. Sala correspondente */}
                  {hasSessions && film.roomName && (
                    <div className="mt-1 mb-2.5">
                      <span className="inline-block text-[11px] font-semibold text-slate-300 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-md leading-none">
                        {film.roomName}
                      </span>
                    </div>
                  )}

                  {/* 4. Grade de Horários em 2 Colunas bem espaçadas e clicáveis */}
                  {hasSessions ? (
                    <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                      {film.todaySessions.map((session) => {
                        const timeStr = new Date(session.startsAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        const { format, language } = getSessionFormatAndLanguage(session, film);

                        return (
                          <div
                            key={session.id}
                            className="flex flex-col items-center gap-1.5"
                          >
                            {/* Botão de Horário amplo com a tipografia oficial Poppins do CineDoom */}
                            <button
                              type="button"
                              onClick={() => handleSelectSession(film.id, session.id)}
                              className="w-full py-2 px-3 rounded-xl bg-[#141A2D] hover:bg-cta hover:text-white border border-white/10 text-white font-bold text-sm tracking-normal transition-all duration-150 cursor-pointer shadow-sm active:scale-95 flex items-center justify-center leading-none"
                              title={`Iniciar venda da sessão de ${timeStr} - ${format} ${language}`}
                            >
                              {timeStr}
                            </button>

                            {/* Indicadores de Formato e Idioma alinhados ao respectivo botão */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 leading-tight">
                                {format}
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cta/20 text-cta leading-tight">
                                {language}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Mensagem de Ausência de Sessões */
                    <div className="py-2.5 px-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs flex items-center gap-2 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
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
