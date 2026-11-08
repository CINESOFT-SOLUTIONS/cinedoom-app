"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Ticket, Clock, Film } from "lucide-react";
import type { FilmItem } from "./types";
import { getPrimaryGenre, formatDuration } from "./film-utils";
import { AgeRatingBadge } from "./age-rating-badge";
import { abandonPreviousReservationIfDifferent } from "@/components/booking/reservation-lifecycle";

interface FilmModalProps {
  film: FilmItem | null;
  onClose: () => void;
}

export function FilmModal({
  film,
  onClose,
}: FilmModalProps) {
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

  if (!film) return null;

  const primaryGenre = getPrimaryGenre(film.genre);
  const durationStr = formatDuration(film.duration);

  return (
    <div
      className="liquid-glass-scrim z-50 p-3 sm:p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="film-modal-title"
    >
      <div
        className="liquid-glass liquid-glass--modal rounded-3xl max-w-2xl w-full p-5 sm:p-7 relative my-auto animate-in zoom-in-95 duration-200 overflow-hidden"
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

        {/* Conteúdo: Sinopse & Metadados */}
        <div className="pt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sinopse
            </h3>
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

          <div className="pt-4 border-t border-borderDark/40">
            <Link
              href={`/portal/reservas?filmeId=${film.id}`}
              onClick={() => {
                abandonPreviousReservationIfDifferent(film.id);
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-cta hover:bg-cta-hover text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-cta/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Ticket className="w-4 h-4" />
              <span>Ver sessões</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
