"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Ticket, Info, Clock, Film, MapPin, Calendar } from "lucide-react";
import type { FilmItem, SessionItem } from "./types";
import { getPrimaryGenre, formatDuration } from "./film-utils";
import { getRoomExperienceCategory, getRoomDisplayName } from "@/shared/experiences";
import { AgeRatingBadge } from "./age-rating-badge";

interface FilmModalProps {
  film: FilmItem | null;
  initialTab?: "sessions" | "details";
  selectedDate?: Date;
  onClose: () => void;
}

export function FilmModal({
  film,
  initialTab = "sessions",
  selectedDate,
  onClose,
}: FilmModalProps) {
  const [activeTab, setActiveTab] = useState<"sessions" | "details">(initialTab);

  // Sincroniza a aba inicial sempre que o filme mudar
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, film]);

  // Bloqueio de rolagem da página (html e body) enquanto o modal estiver aberto e fechar no Escape
  useEffect(() => {
    if (!film) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [film, onClose]);

  const { baseDate, initialIndex } = useMemo(() => {
    if (!selectedDate) {
      return { baseDate: new Date(), initialIndex: 0 };
    }
    const now = new Date();
    const targetZero = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ).getTime();
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.round((targetZero - nowZero) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      return { baseDate: now, initialIndex: diffDays };
    }
    return { baseDate: new Date(selectedDate), initialIndex: 0 };
  }, [selectedDate]);

  const [modalSelectedDay, setModalSelectedDay] = useState<number>(initialIndex);

  // Sincroniza a data inicial do modal sempre que o filme ou a data externa mudar
  useEffect(() => {
    setModalSelectedDay(initialIndex);
  }, [initialIndex, film]);

  // Abas de datas para navegação direta de todos os 7 dias da semana no modal
  const modalDateTabs = useMemo(() => {
    const now = new Date();
    const isNowBase =
      baseDate.getFullYear() === now.getFullYear() &&
      baseDate.getMonth() === now.getMonth() &&
      baseDate.getDate() === now.getDate();

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dayName =
        isNowBase && i === 0
          ? "Hoje"
          : isNowBase && i === 1
            ? "Amanhã"
            : d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
      const dayNumber = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return {
        index: i,
        dayName,
        dayNumber,
        date: d,
      };
    });
  }, [baseDate]);

  if (!film) return null;

  const currentTabInfo = modalDateTabs[modalSelectedDay] || modalDateTabs[0];
  const currentTargetDate = currentTabInfo?.date || new Date();

  // Filtra as sessões do filme para a data selecionada no modal
  const sessionsForSelectedDate = (film.sessions || []).filter((s) => {
    const sDate = new Date(s.startsAt);
    return (
      sDate.getFullYear() === currentTargetDate.getFullYear() &&
      sDate.getMonth() === currentTargetDate.getMonth() &&
      sDate.getDate() === currentTargetDate.getDate()
    );
  });

  // Agrupa sessões da data por sala e ordena por horário
  const sessionsByRoom = sessionsForSelectedDate.reduce<Record<string, SessionItem[]>>(
    (acc, s) => {
      const roomName = s.room.name;
      if (!acc[roomName]) acc[roomName] = [];
      acc[roomName].push(s);
      return acc;
    },
    {}
  );

  // Ordena as salas por número
  const roomNames = Object.keys(sessionsByRoom).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  for (const r of roomNames) {
    sessionsByRoom[r].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
  }

  const primaryGenre = getPrimaryGenre(film.genre);
  const durationStr = formatDuration(film.duration);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="film-modal-title"
    >
      <div
        className="liquid-glass-card rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl relative border border-white/15 my-auto animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer z-10"
          aria-label="Fechar janela"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho do Filme: Pôster à esquerda e dados ao lado */}
        <div className="flex gap-4 sm:gap-5 pb-5 border-b border-borderDark/60 pr-10">
          <div className="relative aspect-[2/3] w-20 sm:w-24 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-white/15 shadow-md">
            {film.posterUrl ? (
              <Image
                src={film.posterUrl}
                alt={film.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Film className="w-8 h-8" />
              </div>
            )}
            <div className="absolute top-1.5 left-1.5 drop-shadow">
              <AgeRatingBadge rating={film.classification} />
            </div>
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <h2
              id="film-modal-title"
              className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-tight line-clamp-2"
            >
              {film.title}
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium">
              {primaryGenre && (
                <span className="px-2 py-0.5 rounded bg-cta/15 text-cta font-semibold uppercase text-[10px] tracking-wider">
                  {primaryGenre}
                </span>
              )}
              {durationStr && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {durationStr}
                </span>
              )}
            </div>

            {film.director && (
              <p className="text-xs text-slate-400 truncate">
                Direção: <span className="text-slate-200">{film.director}</span>
              </p>
            )}
          </div>
        </div>

        {/* Abas de Navegação do Modal */}
        <div className="flex gap-2 pt-4 pb-3 border-b border-borderDark/40">
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "sessions"
                ? "bg-cta text-white shadow-lg shadow-cta/25"
                : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
              }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Horários & Sessões</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "details"
                ? "bg-cta text-white shadow-lg shadow-cta/25"
                : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
              }`}
          >
            <Info className="w-4 h-4" />
            <span>Sinopse & Detalhes</span>
          </button>
        </div>

        {/* Conteúdo da Aba 1: Horários & Sessões (Organização estilo CineSIS no padrão CineDoom) */}
        {activeTab === "sessions" && (
          <div className="pt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {/* Seletor de Datas Compacto */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <Calendar className="w-4 h-4 text-cta shrink-0 mr-1" />
              {modalDateTabs.map((tab) => {
                const isSelected = modalSelectedDay === tab.index;
                return (
                  <button
                    key={tab.index}
                    type="button"
                    onClick={() => setModalSelectedDay(tab.index)}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${isSelected
                        ? "bg-cta text-white shadow-md shadow-cta/25 scale-[1.02]"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5"
                      }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider" suppressHydrationWarning>{tab.dayName}</span>
                    <span className="text-xs font-bold font-mono" suppressHydrationWarning>{tab.dayNumber}</span>
                  </button>
                );
              })}
            </div>

            {/* Cabeçalho da data ativa */}
            <div className="flex items-center justify-between pb-1 pt-1 border-b border-borderDark/30">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Sessões de {modalSelectedDay === 0 ? "Hoje" : modalSelectedDay === 1 ? "Amanhã" : currentTabInfo?.dayNumber || "esta data"}
              </span>
              <span className="text-[11px] text-slate-400">
                {sessionsForSelectedDate.length} {sessionsForSelectedDate.length === 1 ? "sessão" : "sessões"}
              </span>
            </div>

            {/* Listagem de Sessões Organizadas por Sala (Modelo CineSIS adaptado ao CineDoom) */}
            {roomNames.length === 0 ? (
              <div className="py-10 text-center space-y-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <Ticket className="w-8 h-8 text-slate-600 mx-auto opacity-70" />
                <p className="text-sm font-semibold text-rose-400/90">
                  Nenhuma sessão disponível para {modalSelectedDay === 0 ? "hoje" : currentTabInfo?.dayNumber || "esta data"}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Consulte os outros dias nas abas de data acima para encontrar os horários disponíveis.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {roomNames.map((roomName) => {
                  const roomSessions = sessionsByRoom[roomName];
                  const category = getRoomExperienceCategory(roomName);
                  const displayName = getRoomDisplayName(roomName);

                  return (
                    <div
                      key={roomName}
                      className="p-3.5 rounded-2xl bg-[#0E1322]/80 border border-white/10 flex flex-col justify-between space-y-3 shadow-md hover:border-white/20 transition-all"
                    >
                      {/* Identificação da sala e categoria da experiência */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-cta shrink-0" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                            {displayName}
                          </h3>
                        </div>
                        {category === "IMAX" ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                            IMAX
                          </span>
                        ) : category === "VIP" ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            VIP
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                            CLÁSSICA
                          </span>
                        )}
                      </div>

                      {/* Blocos individuais compactos dos horários (sem preço, clique direto para assentos) */}
                      <div className="flex flex-wrap gap-2">
                        {roomSessions.map((sess) => {
                          const time = new Date(sess.startsAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <Link
                              key={sess.id}
                              href={`/portal/sessoes/${sess.id}`}
                              onClick={onClose}
                              className="px-3 py-2 rounded-xl bg-[#141A2D] hover:bg-cta border border-borderDark hover:border-cta text-slate-200 hover:text-white font-mono font-bold text-xs sm:text-sm tracking-wide transition-all shadow-sm hover:shadow-cta/30 hover:scale-105 active:scale-95 text-center flex-1 min-w-[70px] max-w-[100px] flex items-center justify-center cursor-pointer"
                              title={`Reservar assento para sessão das ${time} na ${displayName}`}
                              aria-label={`Sessão às ${time} na ${displayName}`}
                            >
                              {time}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center pt-2">
              Selecione o horário desejado para escolher suas poltronas no mapa de assentos.
            </p>
          </div>
        )}

        {/* Conteúdo da Aba 2: Sinopse & Detalhes (Sem o botão redundante 'Ver Horários e Reservar') */}
        {activeTab === "details" && (
          <div className="pt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Sinopse Oficial
              </h4>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {film.synopsis || "Sinopse não disponível para este filme no momento."}
              </p>
            </div>

            <div className="pt-3 border-t border-borderDark/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {film.genre && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-slate-400 block font-medium">Gênero</span>
                  <span className="text-white font-semibold">{film.genre}</span>
                </div>
              )}
              {durationStr && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-slate-400 block font-medium">Duração</span>
                  <span className="text-white font-semibold">{durationStr}</span>
                </div>
              )}
              {film.director && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-slate-400 block font-medium">Direção</span>
                  <span className="text-white font-semibold">{film.director}</span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <span className="text-slate-400 block font-medium">Classificação</span>
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <AgeRatingBadge rating={film.classification} />
                  <span>
                    {film.classification === "L" || !film.classification
                      ? "Livre para todos os públicos"
                      : `Não recomendado para menores de ${film.classification} anos`}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
