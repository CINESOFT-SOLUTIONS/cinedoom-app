"use client";

import React from "react";
import Image from "next/image";
import { Film, Ticket, Info, Clock } from "lucide-react";
import type { FilmItem } from "./types";
import { AgeRatingBadge } from "./age-rating-badge";
import { getPrimaryGenre, formatDuration, formatFilmMetaLine } from "./film-utils";
import { getRoomExperienceCategory } from "@/shared/experiences";

interface FilmCardProps {
  film: FilmItem;
  onOpenSessions?: (film: FilmItem) => void;
  onOpenDetails?: (film: FilmItem) => void;
}

export function FilmCard({ film, onOpenSessions, onOpenDetails }: FilmCardProps) {
  // Metadados auditados e padronizados: apenas gênero e duração reais
  const primaryGenre = getPrimaryGenre(film.genre);
  const durationStr = formatDuration(film.duration);
  const metaLine = formatFilmMetaLine(film);

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
      </div>
    </article>
  );
}
