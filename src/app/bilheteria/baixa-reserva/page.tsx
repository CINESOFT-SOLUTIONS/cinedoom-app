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
  Check,
  Eye,
  Printer,
  X,
  Copy,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { getCanonicalRoomName } from "@/shared/experiences";
import { TicketModal } from "@/components/tickets/ticket-modal";

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

  // Modal para ver ingressos emitidos
  const [ticketModalData, setTicketModalData] = useState<any | null>(null);
  const [loadingTicketDetails, setLoadingTicketDetails] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  async function abrirIngressos(reservationIdOrCode: string) {
    setLoadingTicketDetails(true);
    setCopiedCode(false);
    try {
      const res = await fetch(`/api/portal/reservas/${reservationIdOrCode}`);
      if (res.ok) {
        const data = await res.json();
        setTicketModalData(data);
      } else {
        // Fallback construído a partir da reserva local
        const item = reservationsList.find(
          (r) => r.id === reservationIdOrCode || r.code === reservationIdOrCode
        );
        if (item) {
          setTicketModalData({
            id: item.id,
            code: item.code,
            status: item.status,
            totalPrice: item.totalAmount,
            film: { title: item.filmTitle },
            room: { name: item.roomName },
            session: { startsAt: item.sessionStartsAt },
            seats: item.seats.map((seatCode) => ({ seatCode })),
            buyer: { name: item.buyerName, cpfMasked: item.buyerCpfMasked },
          });
        }
      }
    } catch {
      // Ignora erro de rede no modal
    } finally {
      setLoadingTicketDetails(false);
    }
  }

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
        // Abre imediatamente os ingressos gerados para conferência / impressão
        await abrirIngressos(targetCode);
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
          <div className="rounded-2xl liquid-glass-card p-5 sm:p-6 space-y-5 border border-white/10 animate-in fade-in duration-150">
            {/* Cabeçalho da Reserva Buscada */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-base text-white tracking-wide">
                  {reservation.code}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-400">
                  {new Date(reservation.session?.startsAt || Date.now()).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  reservation.status === "CONFIRMED"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {reservation.status === "CONFIRMED" ? "Confirmada" : "Aguardando retirada"}
              </span>
            </div>

            {/* Dados Principais em Linha Limpa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Filme & Sala</p>
                <p className="font-semibold text-white truncate text-sm">
                  {reservation.session?.film?.title}
                </p>
                <p className="text-slate-400 mt-0.5">{getCanonicalRoomName(reservation.session?.room?.name)}</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Cliente</p>
                <p className="font-semibold text-white truncate text-sm">
                  {reservation.buyerName || "Cliente"}
                </p>
                <p className="text-slate-400 mt-0.5 font-mono">{reservation.buyerCpfMasked}</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Poltronas</p>
                <p className="font-bold text-cta text-sm">
                  {reservation.sessionSeats?.map((s: any) => s.seat?.seatCode).join(", ") || "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Valor Total</p>
                <p className="font-bold text-emerald-400 text-sm">
                  R$ {Number(reservation.totalPrice || reservation.totalAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Ação */}
            {reservation.status === "PENDING" ? (
              <div className="pt-2 border-t border-white/5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => abrirIngressos(reservation.code)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Pré-visualizar ingressos da reserva"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Ingressos</span>
                </button>
                <button
                  type="button"
                  onClick={() => confirmar()}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Dar Baixa</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => abrirIngressos(reservation.code)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Ver ingressos desta reserva"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Ingressos</span>
                </button>
              </div>
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

            {/* Filtro de Status Discreto */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0A0E1A] border border-borderDark/60 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  statusFilter === "PENDING"
                    ? "bg-amber-500/20 text-amber-300 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Aguardando retirada
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("CONFIRMED")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  statusFilter === "CONFIRMED"
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Confirmadas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white/15 text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Todas
              </button>
            </div>
          </div>

          {/* Lista de Reservas Organizada Horizontalmente */}
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
            <div className="space-y-2.5">
              {filteredList.map((item) => {
                const isPending = item.status === "PENDING";
                const isItemActionLoading = actionLoadingId === item.code;

                return (
                  <div
                    key={item.id}
                    onClick={() => abrirIngressos(item.code)}
                    className="p-4 rounded-xl liquid-glass-card border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 cursor-pointer group"
                  >
                    {/* Bloco 1: Informações Principais (Código, Status, Horário) */}
                    <div className="flex items-center gap-3 shrink-0 lg:w-64">
                      <span className="font-mono font-bold text-sm text-white tracking-wide group-hover:text-cta transition-colors">
                        {item.code}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          isPending
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {isPending ? "Aguardando retirada" : "Confirmada"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Bloco 2: Informações da Reserva (Filme, Sala, Cliente) */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className="truncate">
                        <span className="text-slate-400 text-[11px] block">Filme</span>
                        <span className="font-semibold text-white truncate block group-hover:text-cta transition-colors" title={item.filmTitle}>
                          {item.filmTitle}
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 text-[11px] block">Sala</span>
                        <span className="text-slate-200 truncate block">
                          {getCanonicalRoomName(item.roomName)}
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 text-[11px] block">Cliente</span>
                        <span className="text-slate-200 truncate block" title={item.buyerName}>
                          {item.buyerName}
                        </span>
                      </div>
                    </div>

                    {/* Bloco 3: Informações Complementares (Poltronas, Valor Total) */}
                    <div className="flex items-center gap-4 text-xs shrink-0 lg:w-56 justify-start lg:justify-end">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Poltronas</span>
                        <span className="font-bold text-cta">
                          {item.seats.join(", ") || "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block">Total</span>
                        <span className="font-bold text-white text-sm">
                          R$ {item.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Bloco 4: Ação Administrativa Limpa com Visualização de Ingressos */}
                    <div
                      className="shrink-0 flex items-center justify-end gap-2 border-t lg:border-t-0 pt-2 lg:pt-0 border-white/5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => abrirIngressos(item.code)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Ver ingressos"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ingressos</span>
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => confirmar(item.code)}
                          disabled={isItemActionLoading}
                          className="w-full lg:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isItemActionLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Dar Baixa</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Canônico de Visualização e Impressão de Ingressos Finais */}
      <TicketModal
        isOpen={!!ticketModalData}
        onClose={() => setTicketModalData(null)}
        data={ticketModalData}
        isFinalTicket={true}
      />
    </div>
  );
}
