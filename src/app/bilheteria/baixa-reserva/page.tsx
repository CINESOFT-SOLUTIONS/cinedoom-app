"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  Search,
  CheckCircle,
  ShieldAlert,
  Clock,
  User,
  Film,
  Building,
  RefreshCw,
  Filter,
  Check,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";

interface ReservationItem {
  id: string;
  code: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  expiresAt: string | null;
  buyerName: string;
  buyerCpfMasked: string;
  filmTitle: string;
  roomName: string;
  sessionStartsAt: string;
  seats: string[];
}

export default function BaixaReservaPage() {
  const [code, setCode] = useState("");
  const [reservation, setReservation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lista de reservas em tempo real
  const [reservationsList, setReservationsList] = useState<ReservationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "CONFIRMED" | "ALL">("PENDING");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function carregarListaReservas() {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/bilheteria/reservas/listar?status=${statusFilter}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setReservationsList(Array.isArray(data) ? data : []);
      }
    } catch {
      // Falha silenciosa de polling
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    carregarListaReservas();
    const interval = setInterval(carregarListaReservas, 15000); // Polling a cada 15 segundos
    return () => clearInterval(interval);
  }, [statusFilter]);

  async function buscar() {
    if (!code) return;
    setError(null);
    setSuccess(null);
    setReservation(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/bilheteria/reservas/buscar?codigo=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reserva não encontrada");
      } else {
        setReservation(data);
      }
    } catch {
      setError("Falha ao buscar reserva");
    } finally {
      setLoading(false);
    }
  }

  async function confirmar(codigoEspecifico?: string) {
    const targetCode = codigoEspecifico || code || reservation?.code;
    if (!targetCode) return;

    setError(null);
    setSuccess(null);
    if (codigoEspecifico) {
      setActionLoadingId(codigoEspecifico);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/bilheteria/reservas/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationCode: targetCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao confirmar pagamento");
      } else {
        setSuccess(data.message || `Reserva ${targetCode} confirmada com sucesso!`);
        if (reservation && reservation.code === targetCode) {
          setReservation((r: any) => ({ ...r, status: "CONFIRMED" }));
        }
        // Atualiza a lista na hora
        await carregarListaReservas();
      }
    } catch {
      setError("Falha ao confirmar pagamento");
    } finally {
      setLoading(false);
      setActionLoadingId(null);
    }
  }

  // Filtra a lista localmente pelo texto digitado se houver
  const filteredList = reservationsList.filter((item) => {
    if (!code) return true;
    const q = code.toUpperCase();
    return (
      item.code.toUpperCase().includes(q) ||
      item.buyerName.toUpperCase().includes(q) ||
      item.filmTitle.toUpperCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Header Oficial CineDoom */}
      <CineDoomHeader activePage="baixa-reserva" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 flex-1 w-full">
        {/* Barra de Título & Subtítulo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Ticket className="w-7 h-7 text-cta" />
              <span>Reservas</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Confirmação de pagamento e liberação presencial de ingressos na bilheteria física
            </p>
          </div>

          <button
            onClick={() => carregarListaReservas()}
            disabled={loadingList}
            title="Atualizar lista de reservas"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Digite o código da reserva, CPF ou nome do cliente..."
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscar();
              }}
              className="w-full px-4 py-3 rounded-xl liquid-glass-input text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={buscar}
            disabled={loading || !code}
            className="px-6 py-3 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold shadow-lg shadow-cta/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Consultar</span>
          </button>
        </div>

        {/* Feedbacks de Alerta */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2.5 shadow-md">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2.5 shadow-md">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Card Detalhado da Reserva Buscada Individualmente */}
        {reservation && (
          <div className="rounded-3xl liquid-glass-card p-6 sm:p-8 space-y-6 shadow-2xl border border-white/10 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-borderDark/60 pb-4">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-5 h-5 text-cta" />
                <h2 className="text-lg font-bold text-white">Reserva {reservation.code}</h2>
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold border ${reservation.status === "CONFIRMED"
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-950/60 text-amber-300 border-amber-500/30"
                  }`}
              >
                {reservation.status === "CONFIRMED" ? "PAGA / CONFIRMADA" : "AGUARDANDO RETIRADA"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Filme</p>
                <p className="font-bold text-white">{reservation.session?.film?.title}</p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Sala</p>
                <p className="font-bold text-white">{reservation.session?.room?.name}</p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Horário da Sessão</p>
                <p className="font-bold text-white">
                  {new Date(reservation.session?.startsAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Comprador</p>
                <p className="font-bold text-white">{reservation.buyerName || "Cliente"}</p>
                <p className="text-xs text-slate-400">{reservation.buyerCpfMasked}</p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Poltronas</p>
                <p className="font-bold text-cta">
                  {reservation.sessionSeats?.map((s: any) => s.seat?.seatCode).join(", ")}
                </p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Valor Total</p>
                <p className="text-lg font-black text-emerald-400">
                  R$ {Number(reservation.totalPrice || reservation.totalAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {reservation.status === "PENDING" && (
              <button
                onClick={() => confirmar()}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all text-white flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Confirmar Pagamento Presencial (Emitir Ingressos)</span>
              </button>
            )}
          </div>
        )}

        {/* ========================================================
            LISTA OPERACIONAL DE RESERVAS EM TEMPO REAL
            ======================================================== */}
        <div className="space-y-4 pt-4 border-t border-borderDark/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Reservas Registradas</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold font-mono">
                  {filteredList.length}
                </span>
              </h2>
            </div>

            {/* Filtro de Status */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A0E1A] border border-borderDark/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${statusFilter === "PENDING"
                    ? "bg-amber-500/20 text-amber-300 font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                Aguardando Retirada
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("CONFIRMED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${statusFilter === "CONFIRMED"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                Confirmadas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${statusFilter === "ALL"
                    ? "bg-white/15 text-white font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                Todas
              </button>
            </div>
          </div>

          {/* Tabela / Cards da Lista */}
          {loadingList && reservationsList.length === 0 ? (
            <div className="text-center py-12 rounded-2xl liquid-glass-card text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cta" />
              <span>Carregando reservas registradas...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 rounded-2xl liquid-glass-card text-slate-400 text-xs space-y-2">
              <Ticket className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-300">Nenhuma reserva encontrada</p>
              <p className="text-[11px] text-slate-500">
                {statusFilter === "PENDING"
                  ? "Não há reservas pendentes de retirada no momento."
                  : "Nenhuma reserva corresponde ao filtro selecionado."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredList.map((item) => {
                const isPending = item.status === "PENDING";
                const isItemActionLoading = actionLoadingId === item.code;

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl liquid-glass-card border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-all"
                  >
                    {/* Informações da Reserva */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white px-2 py-0.5 rounded bg-white/10">
                          {item.code}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${isPending
                              ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                              : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                            }`}
                        >
                          {isPending ? "Aguardando Retirada" : "Confirmada"}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(item.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Film className="w-3.5 h-3.5 text-cta shrink-0" />
                          <span className="font-medium truncate">{item.filmTitle}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.roomName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.buyerName}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                        <span>
                          Poltronas: <strong className="text-cta font-mono">{item.seats.join(", ") || "—"}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Total:{" "}
                          <strong className="text-emerald-400 font-semibold">
                            R$ {item.totalAmount.toFixed(2)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Botão de Ação Direta */}
                    <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => confirmar(item.code)}
                          disabled={isItemActionLoading}
                          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {isItemActionLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>Dar Baixa</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Ingressos Emitidos</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
