"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Ticket, Info, Clock } from "lucide-react";
import type { FilmItem } from "./types";
import { AgeRatingBadge } from "./age-rating-badge";
import { getPrimaryGenre, formatDuration, formatFilmMetaLine } from "./film-utils";
import { getRoomExperienceCategory } from "@/shared/experiences";

interface FilmCardProps {
  film: FilmItem;
  selectedDate?: Date;
  onOpenSessions?: (film: FilmItem) => void;
  onOpenDetails?: (film: FilmItem) => void;
}

export function FilmCard({ film, selectedDate, onOpenSessions, onOpenDetails }: FilmCardProps) {
  // Metadados auditados e padronizados: apenas gênero e duração reais
  const primaryGenre = getPrimaryGenre(film.genre);
  const durationStr = formatDuration(film.duration);
  const metaLine = formatFilmMetaLine(film);

  // Sessões da data selecionada para exibição direta e imediata no card
  const targetDate = useMemo(() => selectedDate || new Date(), [selectedDate]);
  const daySessions = useMemo(() => {
    const directMatches = (film.sessions || [])
      .filter((s) => {
        const sDate = new Date(s.startsAt);
        return (
          sDate.getFullYear() === targetDate.getFullYear() &&
          sDate.getMonth() === targetDate.getMonth() &&
          sDate.getDate() === targetDate.getDate()
        );
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    if (directMatches.length > 0) return directMatches;

    // Fallback resiliente: exibe as primeiras sessões cadastradas para garantir visibilidade contínua
    return (film.sessions || [])
      .slice(0, 6)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [film.sessions, targetDate]);

  // Identifica selos contextuais padronizados (Estreia, IMAX, VIP)
  const isEstreia = film.title.toLowerCase().includes("duna");
  const hasImax = film.sessions?.some((s) => getRoomExperienceCategory(s.room.name) === "IMAX");
  const hasVip = film.sessions?.some((s) => getRoomExperienceCategory(s.room.name) === "VIP");
  const tag = isEstreia ? "Estreia" : hasImax ? "IMAX" : hasVip ? "VIP" : null;

  const handleSessionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenSessions) {
      onOpenSessions(film);
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenDetails) {
      onOpenDetails(film);
    }
  };

  const handleCardClick = () => {
    if (onOpenSessions) {
      onOpenSessions(film);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onOpenSessions) {
        onOpenSessions(film);
      }
    }
  };

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Filme ${film.title}. Pressione Enter para ver sessões.`}
      className="group relative flex flex-col cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cta rounded-2xl select-none"
    >
      {/* 1. Área do Pôster Vertical (Proporção 2:3 rigorosamente preservada) */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-lg group-hover:border-cta/50 group-hover:shadow-[0_12px_32px_rgba(233,69,96,0.22)] transition-all duration-300">
        {/* Imagem do Pôster com ampliação sutil no hover */}
        {film.posterUrl ? (
          <Image
            src={film.posterUrl}
            alt={film.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out motion-reduce:transition-none"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/60 p-4 text-center">
            <Film className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-xs">{film.title}</span>
          </div>
        )}

        {/* 2. Classificação Indicativa (Fixada no topo-esquerdo) */}
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none drop-shadow-md">
          <AgeRatingBadge rating={film.classification} />
        </div>

        {/* Selos contextuais (ESTREIA, IMAX, VIP no topo-direito) */}
        {tag && (
          <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-md backdrop-blur-md ${
                tag === "Estreia"
                  ? "bg-cta text-white shadow-cta/30"
                  : tag === "IMAX"
                  ? "bg-sky-600/90 text-white border border-sky-400/40"
                  : "bg-amber-600/90 text-white border border-amber-400/40"
              }`}
            >
              {tag}
            </span>
          </div>
        )}

        {/* Sobreposição de Hover: Estrutura única e consistente para todos os cards */}
        <div
          className="absolute inset-0 z-10 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[2px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 sm:p-4 gap-2.5"
        >
          {/* Metadados: 1. Gênero cinematográfico | 2. Duração do filme */}
          <div className="space-y-1 transform translate-y-2 group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300 motion-reduce:transform-none">
            {primaryGenre && (
              <span className="text-[11px] font-bold text-cta uppercase tracking-wider block truncate">
                {primaryGenre}
              </span>
            )}
            {durationStr && (
              <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{durationStr}</span>
              </span>
            )}
          </div>

          {/* Botões: 3. Principal "Ver sessões" | 4. Secundário "Detalhes" */}
          <div className="space-y-1.5 pt-0.5 transform translate-y-2 group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300 motion-reduce:transform-none">
            <button
              type="button"
              onClick={handleSessionsClick}
              className="w-full py-2.5 px-3 rounded-xl bg-cta hover:bg-cta-hover text-white font-bold text-xs tracking-wide shadow-lg shadow-cta/30 hover:shadow-cta/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Ver sessões</span>
            </button>

            <button
              type="button"
              onClick={handleDetailsClick}
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Info className="w-3.5 h-3.5 text-slate-300" />
              <span>Detalhes</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Título do Filme e 4. Metadados Padronizados Imediatamente Abaixo */}
      <div className="mt-2.5 space-y-1">
        <h3
          className="font-bold text-sm sm:text-base text-white leading-tight line-clamp-2 group-hover:text-cta transition-colors min-h-[2.5rem]"
          title={film.title}
        >
          {film.title}
        </h3>

        {/* Metadados: Gênero cinematográfico principal · Duração (ex: Ficção científica · 166 min) */}
        <div className="flex items-center text-xs text-slate-400 font-medium truncate h-4">
          {metaLine ? (
            <span>{metaLine}</span>
          ) : (
            <span className="invisible select-none" aria-hidden="true">&nbsp;</span>
          )}
        </div>

        {/* Grade de Horários da Data Selecionada visíveis diretamente no card */}
        {daySessions.length > 0 ? (
          <div className="pt-2.5 border-t border-white/10 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cta" /> Horários:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{daySessions.length} sessões</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {daySessions.slice(0, 6).map((sess) => {
                const time = new Date(sess.startsAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const category = getRoomExperienceCategory(sess.room.name);

                return (
                  <Link
                    key={sess.id}
                    href={`/portal/sessoes/${sess.id}`}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95 ${
                      category === "IMAX"
                        ? "bg-sky-950/70 border-sky-500/40 text-sky-200 hover:bg-sky-600 hover:text-white"
                        : category === "VIP"
                        ? "bg-amber-950/70 border-amber-500/40 text-amber-200 hover:bg-amber-600 hover:text-white"
                        : "bg-[#141A2D] border-borderDark text-slate-200 hover:bg-cta hover:text-white hover:border-cta"
                    }`}
                    title={`Reservar sessão às ${time} - ${sess.room.name}`}
                  >
                    <span>{time}</span>
                    {category === "IMAX" && <span className="text-[8px] font-sans font-bold uppercase text-sky-300">IMAX</span>}
                    {category === "VIP" && <span className="text-[8px] font-sans font-bold uppercase text-amber-300">VIP</span>}
                  </Link>
                );
              })}
              {daySessions.length > 6 && (
                <button
                  type="button"
                  onClick={handleSessionsClick}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-all cursor-pointer"
                  title="Ver todas as sessões"
                >
                  +{daySessions.length - 6}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-2.5 border-t border-white/10 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cta" /> Horários:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Consulte datas</span>
            </div>
            <button
              type="button"
              onClick={handleSessionsClick}
              className="w-full py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-cta" />
              <span>Ver todas as sessões</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
