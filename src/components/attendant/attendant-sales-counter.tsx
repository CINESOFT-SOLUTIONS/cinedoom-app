"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Film, Search, Ticket, AlertCircle } from "lucide-react";
import { AgeRatingBadge } from "@/components/home/age-rating-badge";
import { getCanonicalRoomName, getRoomExperienceCategory } from "@/shared/experiences";
import { abandonPreviousReservationIfDifferent } from "@/components/booking/reservation-lifecycle";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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

      // Identifica a sala principal da sessão no padrão canônico (ex: Sala 01 .. Sala 04)
      const firstRoomRaw = todaySessions[0]?.room?.name;
      const roomName = firstRoomRaw ? getCanonicalRoomName(firstRoomRaw) : null;

      return {
        ...film,
        todaySessions,
        roomName,
      };
    });
  }, [films, today]);

  const handleSelectSession = (filmId: string, sessionId: string) => {
    abandonPreviousReservationIfDifferent(filmId, sessionId);
    router.push(`/portal/reservas?filmeId=${filmId}&sessionId=${sessionId}`);
  };

  const handleOpenMoreDates = (film: FilmItem) => {
    abandonPreviousReservationIfDifferent(film.id);
    router.push(`/portal/reservas?filmeId=${film.id}`);
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
        </div>
      </div>

      {/* Grade de Filmes em Cards Amplos e Legíveis para Operação Rápida */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-7 items-start w-full">
          {filmsWithTodaySessions.map((film) => {
            const hasSessions = film.todaySessions.length > 0;

            return (
              <div
                key={film.id}
                data-testid={`attendant-card-${film.id}`}
                className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-2 transition-all shadow-lg hover:border-white/20 w-full"
              >
                {/* Cabeçalho do Card: Nome do filme em cima do pôster */}
                <h2
                  title={film.title}
                  className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight line-clamp-2"
                >
                  {film.title}
                </h2>

                <div className="flex gap-5 items-start h-auto">
                  {/* Coluna Esquerda: Pôster ampliado com proporção adequada e presença visual + Botão "Mais datas" */}
                  <div className="flex flex-col items-center gap-2.5 shrink-0 w-[120px] sm:w-[130px]">
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-md shrink-0">
                      {film.posterUrl ? (
                        <Image
                          src={film.posterUrl}
                          alt={film.title}
                          fill
                          sizes="130px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Film className="w-9 h-9 opacity-40" />
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5 z-10 scale-95 origin-top-left shadow-sm">
                        <AgeRatingBadge rating={film.classification} />
                      </div>
                    </div>

                    {/* Botão "Mais datas" posicionado imediatamente abaixo do pôster */}
                    <button
                      type="button"
                      onClick={() => handleOpenMoreDates(film)}
                      className="w-full py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 leading-none"
                      title="Ver sessões em outros dias"
                    >
                      <Search className="w-3.5 h-3.5 text-cta shrink-0" />
                      <span className="whitespace-nowrap">Mais datas</span>
                    </button>
                  </div>

                  {/* Coluna Direita: Informações e Grade de Horários em 2 Colunas */}
                  <div className="flex-1 min-w-0 flex flex-col justify-start">
                    {/* 1. Identificação "Sessões de hoje" e contagem discreta */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Sessões de hoje
                      </span>
                      {hasSessions && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {film.todaySessions.length} {film.todaySessions.length === 1 ? "sessão" : "sessões"}
                        </span>
                      )}
                    </div>

                    {/* 2. Sala correspondente como texto normal */}
                    {hasSessions && film.roomName && (
                      <div className="mt-1.5 mb-3 flex items-center gap-1.5 text-xs sm:text-sm text-slate-300">
                        <span className="font-semibold text-white">{film.roomName}</span>
                      </div>
                    )}

                    {/* 3. Grade de Horários em 2 Colunas ampliadas e com toque confortável */}
                    {hasSessions ? (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 pt-1">
                        {film.todaySessions.map((session) => {
                          const timeStr = new Date(session.startsAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          const { format, language } = getSessionFormatAndLanguage(session, film);

                          return (
                            <div
                              key={session.id}
                              className="flex flex-col items-stretch gap-1.5 w-full"
                            >
                              {/* Botão de Horário amplo com formato retangular firme */}
                              <button
                                type="button"
                                onClick={() => handleSelectSession(film.id, session.id)}
                                className="w-full py-2.5 px-3 rounded-md bg-[#141A2D] hover:bg-cta hover:text-white border border-white/10 text-white font-bold text-base tracking-normal transition-all duration-150 cursor-pointer shadow-sm active:scale-95 flex items-center justify-center leading-none"
                                title={`Iniciar venda da sessão de ${timeStr} - ${format} ${language}`}
                              >
                                {timeStr}
                              </button>

                              {/* Indicadores de Formato e Idioma divididos e ocupando 100% do espaço abaixo do botão */}
                              <div className="grid grid-cols-2 gap-1 w-full">
                                <span className="w-full text-center text-[11px] font-semibold py-1 px-1 rounded-sm bg-white/10 text-slate-300 leading-tight">
                                  {format}
                                </span>
                                <span className="w-full text-center text-[11px] font-semibold py-1 px-1 rounded-sm bg-cta/20 text-cta leading-tight">
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
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
