"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Clock, Ticket, ExternalLink, CheckCircle2, History } from "lucide-react";
import { getCanonicalRoomName } from "@/shared/experiences";

export interface ReservationItem {
  id: string;
  code: string;
  status: string;
  totalPrice: number | string;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  session: {
    startsAt: Date | string;
    film: {
      title: string;
    };
    room: {
      name: string;
    };
  };
  sessionSeats: Array<{
    seat: {
      seatCode: string;
    };
  }>;
}

interface ReservationsTabsPanelProps {
  activeReservations: ReservationItem[];
  expiredReservations: ReservationItem[];
}

function formatSessionDateTime(date: Date | string) {
  const d = new Date(date);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function ReservationsTabsPanel({
  activeReservations,
  expiredReservations,
}: ReservationsTabsPanelProps) {
  const [activeTab, setActiveTab] = useState<"active" | "expired">("active");

  const displayedList = activeTab === "active" ? activeReservations : expiredReservations;
  const isCurrentExpired = activeTab === "expired";

  return (
    <div className="space-y-6">
      {/* Barra de Abas (Tabs) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-0">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`group relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer rounded-t-xl outline-none focus-visible:ring-2 focus-visible:ring-cta ${
            activeTab === "active"
              ? "bg-white/10 text-white font-bold"
              : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
          aria-selected={activeTab === "active"}
          role="tab"
        >
          <CheckCircle2
            className={`w-4 h-4 transition-colors ${
              activeTab === "active" ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"
            }`}
          />
          <span>Ativos</span>
          {activeTab === "active" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-cta rounded-full shadow-[0_0_8px_rgba(233,69,96,0.6)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expired")}
          className={`group relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer rounded-t-xl outline-none focus-visible:ring-2 focus-visible:ring-cta ${
            activeTab === "expired"
              ? "bg-white/10 text-white font-bold"
              : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
          aria-selected={activeTab === "expired"}
          role="tab"
        >
          <History
            className={`w-4 h-4 transition-colors ${
              activeTab === "expired" ? "text-cta" : "text-slate-500 group-hover:text-slate-400"
            }`}
          />
          <span>Expirados</span>
          {activeTab === "expired" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-cta rounded-full shadow-[0_0_8px_rgba(233,69,96,0.6)]" />
          )}
        </button>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {displayedList.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl liquid-glass-card border border-white/10 text-center space-y-2">
          <Ticket className="w-8 h-8 text-slate-600 mx-auto opacity-70" />
          <p className="text-sm font-semibold text-slate-300">
            {activeTab === "active"
              ? "Nenhuma reserva ativa no momento."
              : "Nenhuma reserva expirada ou cancelada no histórico."}
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === "active"
              ? "Quando você reservar ingressos para as sessões, eles aparecerão listados aqui."
              : "Reservas concluídas ou que ultrapassaram o prazo de pagamento serão registradas nesta aba."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map((res) => {
            const sessionDT = formatSessionDateTime(res.session.startsAt);
            const seatList = res.sessionSeats.map((s) => s.seat.seatCode).join(", ");
            const isConfirmed = res.status === "CONFIRMED";

            return (
              <Link
                key={res.id}
                href={`/portal/reservas/${res.id}/comprovante`}
                className={`group block rounded-2xl liquid-glass-card transition-all duration-200 border ${
                  isCurrentExpired
                    ? "opacity-75 border-white/5 hover:opacity-95 hover:border-white/20 hover:bg-white/[0.04]"
                    : "border-white/10 hover:border-white/30 hover:shadow-xl hover:shadow-black/30 hover:bg-white/[0.06]"
                } p-4 sm:p-5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cta`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Bloco Principal: Informações essenciais do filme e sessão */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-base font-bold tracking-tight truncate ${
                          isCurrentExpired ? "text-slate-300" : "text-white"
                        } group-hover:text-cta transition-colors`}
                      >
                        {res.session.film.title}
                      </h3>
                      {!isCurrentExpired && (
                        <span className="text-[11px] font-semibold text-cta bg-cta/10 border border-cta/25 px-2 py-0.5 rounded-full">
                          {getCanonicalRoomName(res.session.room.name)}
                        </span>
                      )}
                    </div>

                    {/* Dados contextuais essenciais em uma linha legível */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cta shrink-0" />
                        <span>
                          {sessionDT.date} às{" "}
                          <strong className="text-white font-medium">{sessionDT.time}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          Assentos:{" "}
                          <strong className="text-white font-mono">{seatList}</strong>
                        </span>
                      </div>

                      <div className="text-slate-400">
                        Código:{" "}
                        <strong className="text-white font-mono">{res.code}</strong>
                      </div>

                      <div className="text-slate-400">
                        Total:{" "}
                        <strong
                          className={`font-semibold ${
                            isCurrentExpired ? "text-slate-300" : "text-emerald-400"
                          }`}
                        >
                          R$ {Number(res.totalPrice).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Bloco Lateral: Status e Indicador Visual "Ver Mais" */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                    {!isCurrentExpired && (
                      <div className="flex items-center">
                        {isConfirmed ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Confirmada
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Aguardando Pagamento
                          </span>
                        )}
                      </div>
                    )}

                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/10 group-hover:bg-cta group-hover:border-cta/40 group-hover:text-white border border-white/15 text-white font-semibold text-xs transition-all shadow-sm">
                      <span>Ver Mais</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

