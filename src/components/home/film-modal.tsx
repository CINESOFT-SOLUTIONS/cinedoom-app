"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Ticket, Info, Clock, Film, MapPin, CheckCircle2, ChevronRight } from "lucide-react";
import type { FilmItem, SessionItem } from "./types";
import { getPrimaryGenre, formatDuration } from "./film-utils";
import { getRoomExperienceCategory, getRoomDisplayName } from "@/shared/experiences";
import { AgeRatingBadge } from "./age-rating-badge";

interface FilmModalProps {
  film: FilmItem | null;
  initialTab?: "sessions" | "details";
  onClose: () => void;
}

export function FilmModal({ film, initialTab = "sessions", onClose }: FilmModalProps) {
  const [activeTab, setActiveTab] = useState<"sessions" | "details">(initialTab);

  // Sincroniza a aba inicial sempre que o filme mudar
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, film]);

  // Bloqueio de rolagem do body enquanto o modal estiver aberto e fechar no Escape
  useEffect(() => {
    if (!film) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [film, onClose]);

  if (!film) return null;

  // Agrupa sessões por sala
  const sessionsByRoom = (film.sessions || []).reduce<Record<string, SessionItem[]>>(
    (acc, s) => {
      const roomName = s.room.name;
      if (!acc[roomName]) acc[roomName] = [];
      acc[roomName].push(s);
      return acc;
    },
    {}
  );

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
        className="liquid-glass-card rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative border border-white/15 my-auto animate-in zoom-in-95 duration-200 overflow-hidden"
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

        {/* Cabeçalho do Filme */}
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
        <div className="flex gap-2 pt-4 pb-2 border-b border-borderDark/40">
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "sessions"
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "details"
                ? "bg-cta text-white shadow-lg shadow-cta/25"
                : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Sinopse & Detalhes</span>
          </button>
        </div>

        {/* Conteúdo da Aba 1: Horários & Sessões */}
        {activeTab === "sessions" && (
          <div className="pt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {Object.keys(sessionsByRoom).length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  Nenhuma sessão programada no momento
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Novos horários para este filme serão disponibilizados em breve.
                </p>
              </div>
            ) : (
              Object.entries(sessionsByRoom).map(([roomName, roomSessions]) => {
                const category = getRoomExperienceCategory(roomName);
                const displayName = getRoomDisplayName(roomName);

                return (
                  <div
                    key={roomName}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-cta shrink-0" />
                        <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                          {displayName}
                        </h3>
                      </div>
                      {category === "IMAX" ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          IMAX
                        </span>
                      ) : category === "VIP" ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          VIP
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Clássica
                        </span>
                      )}
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
                            onClick={onClose}
                            className="group/btn flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#141A2D] hover:bg-cta border border-borderDark hover:border-cta text-slate-200 hover:text-white transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <span className="font-mono font-bold text-sm leading-none">
                              {time}
                            </span>
                            <span className="text-xs font-semibold text-emerald-400 group-hover/btn:text-white pl-2 border-l border-white/10">
                              R$ {sess.price.toFixed(2)}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition-transform group-hover/btn:translate-x-0.5" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            <p className="text-[11px] text-slate-400 text-center pt-2">
              Clique no horário desejado para escolher suas poltronas no mapa de assentos.
            </p>
          </div>
        )}

        {/* Conteúdo da Aba 2: Sinopse & Detalhes */}
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

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab("sessions")}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold shadow-lg shadow-cta/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Ticket className="w-4 h-4" />
                <span>Ver Horários e Reservar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
