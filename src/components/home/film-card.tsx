"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Film } from "lucide-react";
import type { FilmItem, SessionItem } from "./types";
import { GENRE_MAP } from "./types";
import { AgeRatingBadge } from "./age-rating-badge";

interface FilmCardProps {
  film: FilmItem;
}

export function FilmCard({ film }: FilmCardProps) {
  const sessionsByRoom = film.sessions.reduce<Record<string, SessionItem[]>>(
    (acc, s) => {
      const roomName = s.room.name;
      if (!acc[roomName]) acc[roomName] = [];
      acc[roomName].push(s);
      return acc;
    },
    {}
  );

  const genreText = GENRE_MAP[film.title] || film.genre || "Filme em Cartaz";

  return (
    <div className="liquid-glass-card hover:border-white/25 rounded-3xl p-5 md:p-6 shadow-xl transition-all grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Poster 2:3 */}
      <div className="md:col-span-3 lg:col-span-2 relative aspect-[2/3] w-full max-w-[170px] mx-auto md:mx-0 rounded-xl overflow-hidden bg-black/40 shadow-lg group">
        {film.posterUrl ? (
          <Image
            src={film.posterUrl}
            alt={film.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <Film className="w-10 h-10" />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <AgeRatingBadge rating={film.classification} />
        </div>
      </div>

      {/* Informações do Filme & Sessões */}
      <div className="md:col-span-9 lg:col-span-10 flex flex-col justify-between h-full space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl md:text-2xl font-semibold text-white leading-tight">
              {film.title}
            </h3>
            <span className="text-[11px] font-medium text-cta uppercase tracking-wider px-2 py-0.5 rounded bg-cta/10">
              {genreText.split("•")[0]?.trim()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
            {film.duration && <span>{film.duration} min</span>}
            <span>• {genreText}</span>
            {film.director && <span>• Direção: {film.director}</span>}
          </div>

          {film.synopsis && (
            <p className="text-xs text-slate-300/80 leading-relaxed line-clamp-2 max-w-3xl">
              {film.synopsis}
            </p>
          )}
        </div>

        {/* Sessões Agrupadas por Sala */}
        <div className="pt-4 border-t border-borderDark/60 space-y-4">
          {Object.keys(sessionsByRoom).length === 0 ? (
            <div className="text-xs text-slate-500 italic py-1">
              Nenhuma sessão programada para este filme na data selecionada.
            </div>
          ) : (
            Object.entries(sessionsByRoom).map(([roomName, roomSessions]) => {
              return (
                <div key={roomName} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      {roomName}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {roomSessions.map((sess) => {
                      const time = new Date(sess.startsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <Link
                          key={sess.id}
                          href={`/portal/sessoes/${sess.id}`}
                          className="group/pill flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-[#141A2D] hover:bg-cta border border-borderDark hover:border-cta text-slate-200 hover:text-white transition-all shadow-md hover:scale-[1.03] active:scale-[0.98]"
                        >
                          <span className="font-mono font-semibold text-sm block leading-none">
                            {time}
                          </span>
                          <span className="text-[10px] font-medium text-emerald-400 group-hover/pill:text-white mt-1">
                            R$ {sess.price.toFixed(2)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
