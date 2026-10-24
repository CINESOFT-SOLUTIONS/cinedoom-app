"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Clock, Ticket, Play, X } from "lucide-react";
import type { FilmItem } from "./types";
import { GENRE_MAP } from "./types";
import { AgeRatingBadge } from "./age-rating-badge";

interface HeroBillboardProps {
  films: FilmItem[];
  heroIndex: number;
  onSelectHeroIndex: (idx: number) => void;
}

export function HeroBillboard({
  films,
  heroIndex,
  onSelectHeroIndex,
}: HeroBillboardProps) {
  const [detailModalFilm, setDetailModalFilm] = useState<FilmItem | null>(null);
  const activeHeroFilm = films[heroIndex] || films[0];

  return (
    <>
      <section className="relative w-full bg-[#0B0F1C] overflow-hidden min-h-[400px] sm:min-h-[460px] md:min-h-[540px] flex items-center">
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20 w-full">
          <div className="max-w-2xl space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="px-2.5 py-1 rounded bg-cta text-white font-semibold text-[10px] sm:text-[11px] tracking-wider uppercase shadow-md shadow-cta/30">
                Em Destaque
              </span>
              <span className="px-2.5 py-1 rounded bg-surface/90 border border-borderDark text-amber-300 font-medium text-[10px] sm:text-[11px] tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Sala 3 IMAX Laser
              </span>
              <AgeRatingBadge rating={activeHeroFilm?.classification} />
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight sm:leading-none drop-shadow-xl">
              {activeHeroFilm?.title || "Duna: Parte Dois"}
            </h1>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-normal text-slate-300">
              {activeHeroFilm?.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cta" />
                  {activeHeroFilm.duration} minutos
                </span>
              )}
              <span className="text-slate-400 border-l border-borderDark pl-2.5 sm:pl-3">
                {GENRE_MAP[activeHeroFilm?.title || ""] || "Filme em Cartaz"}
              </span>
              {activeHeroFilm?.director && (
                <span className="text-slate-400 border-l border-borderDark pl-2.5 sm:pl-3 hidden sm:inline">
                  Direção: {activeHeroFilm.director}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm md:text-base text-slate-300/90 leading-relaxed line-clamp-3 max-w-xl">
              {activeHeroFilm?.synopsis ||
                "Consulte a programação do CineDoom, selecione suas poltronas no mapa interativo e reserve seus ingressos com confirmação atômica ACID."}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5">
              <a
                href="#programacao"
                className="px-6 py-3 sm:py-3.5 rounded-xl bg-cta hover:bg-cta-hover text-white font-semibold text-xs sm:text-sm shadow-xl shadow-cta/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                <span>Ver Sessões & Reservar</span>
              </a>

              {activeHeroFilm && (
                <button
                  type="button"
                  onClick={() => setDetailModalFilm(activeHeroFilm)}
                  className="px-5 py-3 sm:py-3.5 rounded-xl bg-surface/80 hover:bg-surface border border-borderDark text-white font-medium text-xs sm:text-sm transition-all hover:border-slate-400 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-cta fill-cta" />
                  <span>Ver Detalhes</span>
                </button>
              )}

              {activeHeroFilm?.sessions?.[0] && (
                <Link
                  href={`/portal/sessoes/${activeHeroFilm.sessions[0].id}`}
                  className="px-4 py-3 sm:py-3.5 rounded-xl bg-[#141A2D] hover:bg-surface border border-borderDark text-emerald-400 font-medium text-xs transition-all flex items-center justify-center gap-1.5"
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
                  onClick={() => onSelectHeroIndex(idx)}
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

      {/* Modal de Detalhes do Filme */}
      {detailModalFilm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="liquid-glass-card rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setDetailModalFilm(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <AgeRatingBadge rating={detailModalFilm.classification} />
              <h4 className="text-lg font-semibold text-white">{detailModalFilm.title}</h4>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <div>
                <strong>Duração:</strong> {detailModalFilm.duration} minutos
              </div>
              <div>
                <strong>Gênero:</strong> {GENRE_MAP[detailModalFilm.title] || detailModalFilm.genre}
              </div>
              {detailModalFilm.director && (
                <div>
                  <strong>Direção:</strong> {detailModalFilm.director}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {detailModalFilm.synopsis || "Sem sinopse disponível no momento."}
            </p>

            <div className="pt-3 border-t border-borderDark flex justify-end">
              <a
                href="#programacao"
                onClick={() => setDetailModalFilm(null)}
                className="px-4 py-2 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-semibold transition-all"
              >
                Ver Horários Disponíveis
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
