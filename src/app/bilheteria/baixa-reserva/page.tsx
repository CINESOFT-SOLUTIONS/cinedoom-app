"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Ban,
  AlertTriangle,
  Banknote,
  CreditCard,
  QrCode,
  Info,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { getCanonicalRoomName } from "@/shared/experiences";
import { TicketModal } from "@/components/tickets/ticket-modal";
import { Pagination } from "@/components/ui/pagination";

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

interface SoldTicketItem {
  id: string;
  code: string;
  price: number | string;
  type: string;
  status: "SOLD" | "CANCELLED";
  soldAt: string;
  session: {
    id: string;
    startsAt: string;
    film: {
      id: string;
      title: string;
    };
    room: {
      id: string;
      name: string;
    };
  };
  seat: {
    id: string;
    seatCode: string;
  };
  buyer: {
    id: string;
    name: string;
    email: string;
  } | null;
  cancellationAudit?: {
    id: string;
    reason: string;
    cancelledAt: string;
  } | null;
}

export default function BaixaReservaPage() {
  // Aba ativa: "RESERVAS" (Resgate/Baixa) ou "CANCELAMENTO" (Vendas e Cancelamento)
  const [activeTab, setActiveTab] = useState<"RESERVAS" | "CANCELAMENTO">("RESERVAS");

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
  const [reservationsPage, setReservationsPage] = useState(1);

  // Lista de Ingressos/Vendas para Cancelamento
  const [soldTickets, setSoldTickets] = useState<SoldTicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"ALL" | "SOLD" | "CANCELLED">("SOLD");
  const [ticketsPage, setTicketsPage] = useState(1);

  // Modal de Cancelamento de Ingresso
  const [cancelModalTicket, setCancelModalTicket] = useState<SoldTicketItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Modal para ver ingressos emitidos
  const [ticketModalData, setTicketModalData] = useState<any | null>(null);
  const [loadingTicketDetails, setLoadingTicketDetails] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal da Etapa 4 (Pagamento)
  const [paymentModalReservation, setPaymentModalReservation] = useState<ReservationItem | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"DINHEIRO" | "DEBITO" | "CREDITO" | "PIX">("DINHEIRO");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  function iniciarPagamento(r: any) {
    if (!r) return;
    const itemTarget: ReservationItem = {
      id: r.id || "",
      code: r.code,
      status: r.status,
      totalAmount: Number(r.totalAmount || r.totalPrice || 0),
      createdAt: r.createdAt || new Date().toISOString(),
      expiresAt: r.expiresAt || null,
      buyerName: r.buyerName || r.buyer?.name || "Cliente",
      buyerCpfMasked: r.buyerCpfMasked || r.buyer?.cpfMasked || "***.***.***-**",
      filmTitle: r.filmTitle || r.film?.title || r.session?.film?.title || "Filme CineDoom",
      roomName: r.roomName || r.room?.name || r.session?.room?.name || "Sala",
      sessionStartsAt: r.sessionStartsAt || r.session?.startsAt || new Date().toISOString(),
      seats: Array.isArray(r.seats)
        ? r.seats.map((s: any) => typeof s === "string" ? s : (s.seatCode || s.seat?.seatCode || ""))
        : [],
    };
    setPaymentModalReservation(itemTarget);
    setSelectedPaymentMethod("DINHEIRO");
    setCashTendered("");
  }

  async function finalizarPagamento() {
    if (!paymentModalReservation) return;
    const targetCode = paymentModalReservation.code;
    setIsSubmittingPayment(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/bilheteria/reservas/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationCode: targetCode,
          paymentMethod: selectedPaymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao confirmar pagamento");
      } else {
        setSuccess(data.message || `Reserva ${targetCode} confirmada com sucesso! Pagamento: ${selectedPaymentMethod}`);
        if (reservation && reservation.code === targetCode) {
          setReservation((r: any) => ({ ...r, status: "CONFIRMED" }));
        }
        setPaymentModalReservation(null);
        await abrirIngressos(targetCode);
        await carregarListaReservas();
      }
    } catch {
      setError("Falha ao confirmar pagamento da reserva");
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  async function abrirIngressoDoTicket(t: SoldTicketItem) {
    if (t.code) {
      await abrirIngressos(t.code);
      return;
    }
    setTicketModalData({
      id: t.id,
      code: t.code || t.id.slice(-6).toUpperCase(),
      status: t.status === "SOLD" ? "CONFIRMED" : "CANCELLED",
      totalPrice: Number(t.price || 0),
      film: { title: t.session?.film?.title || "Filme CineDoom" },
      room: { name: t.session?.room?.name || "Sala" },
      session: { startsAt: t.session?.startsAt },
      seats: [{ seatCode: t.seat?.seatCode || "—" }],
      buyer: { name: t.buyer?.name || "Cliente Balcão", email: t.buyer?.email },
    });
  }

  async function abrirIngressos(reservationIdOrCode: string) {
    setLoadingTicketDetails(true);
    setCopiedCode(false);
    try {
      const res = await fetch(`/api/portal/reservas/${reservationIdOrCode}`);
      if (res.ok) {
        const data = await res.json();
        setTicketModalData(data);
      } else {
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
      // Silencioso
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
      // Silencioso
    } finally {
      setLoadingList(false);
    }
  }

  async function carregarListaIngressos() {
    setLoadingTickets(true);
    try {
      const url =
        ticketStatusFilter === "ALL"
          ? "/api/ingressos"
          : `/api/ingressos?status=${ticketStatusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSoldTickets(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    if (activeTab === "RESERVAS") {
      carregarListaReservas();
      const interval = setInterval(carregarListaReservas, 15000);
      return () => clearInterval(interval);
    } else {
      carregarListaIngressos();
      const interval = setInterval(carregarListaIngressos, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab, statusFilter, ticketStatusFilter]);

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
        await abrirIngressos(targetCode);
        await carregarListaReservas();
      }
    } catch {
      setError("Falha ao confirmar pagamento");
    } finally {
      setLoading(false);
      setActionLoadingId(null);
    }
  }

  // Ação de Cancelamento de Venda / Ingresso
  async function executarCancelamento() {
    if (!cancelModalTicket) return;
    if (!cancelReason.trim()) {
      alert("Por favor, informe a justificativa/motivo do cancelamento.");
      return;
    }

    setCancelSubmitting(true);
    try {
      const res = await fetch(`/api/ingressos/${cancelModalTicket.id}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Não foi possível cancelar o ingresso.");
      } else {
        setSuccess(`Ingresso ${cancelModalTicket.code || cancelModalTicket.id.slice(-6)} cancelado com sucesso. Poltrona liberada.`);
        setCancelModalTicket(null);
        setCancelReason("");
        await carregarListaIngressos();
      }
    } catch {
      alert("Erro de conexão ao processar cancelamento.");
    } finally {
      setCancelSubmitting(false);
    }
  }

  // Filtros locais
  const filteredReservations = reservationsList.filter((item) => {
    if (!code) return true;
    const q = code.toUpperCase();
    return (
      item.code.toUpperCase().includes(q) ||
      item.buyerName.toUpperCase().includes(q) ||
      item.filmTitle.toUpperCase().includes(q)
    );
  });

  const filteredSoldTickets = soldTickets.filter((item) => {
    if (!ticketSearch) return true;
    const q = ticketSearch.toUpperCase();
    return (
      (item.code && item.code.toUpperCase().includes(q)) ||
      item.id.toUpperCase().includes(q) ||
      (item.buyer?.name && item.buyer.name.toUpperCase().includes(q)) ||
      (item.session?.film?.title && item.session.film.title.toUpperCase().includes(q)) ||
      (item.seat?.seatCode && item.seat.seatCode.toUpperCase().includes(q))
    );
  });

  // Paginação com no máximo 20 itens por página
  const PAGE_SIZE = 20;

  const paginatedReservations = useMemo(() => {
    const start = (reservationsPage - 1) * PAGE_SIZE;
    return filteredReservations.slice(start, start + PAGE_SIZE);
  }, [filteredReservations, reservationsPage]);

  const paginatedSoldTickets = useMemo(() => {
    const start = (ticketsPage - 1) * PAGE_SIZE;
    return filteredSoldTickets.slice(start, start + PAGE_SIZE);
  }, [filteredSoldTickets, ticketsPage]);

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      <CineDoomHeader activePage="baixa-reserva" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 flex-1 w-full">
        {/* Barra de Título & Subtítulo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Ticket className="w-7 h-7 text-cta" />
              <span>Atendimento de Bilheteria</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Resgate de reservas online e cancelamento de vendas com auditoria
            </p>
          </div>

          <button
            onClick={() => (activeTab === "RESERVAS" ? carregarListaReservas() : carregarListaIngressos())}
            disabled={loadingList || loadingTickets}
            title="Atualizar lista"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList || loadingTickets ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Abas Superiores de Navegação */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#0A0E1A] border border-borderDark/60 w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("RESERVAS")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "RESERVAS"
              ? "bg-cta text-white shadow-md shadow-cta/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span>Resgate de Reservas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CANCELAMENTO")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "CANCELAMENTO"
              ? "bg-cta text-white shadow-md shadow-cta/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Ban className="w-3.5 h-3.5 shrink-0" />
            <span>Cancelar Venda</span>
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
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 1: RESGATE DE RESERVAS ONLINE                                         */}
        {/* ========================================================================= */}
        {activeTab === "RESERVAS" && (
          <div className="space-y-6">
            {/* Campo de Busca e Filtros de Reservas */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Digite o código da reserva, CPF ou nome do cliente..."
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setReservationsPage(1);
                  }}
                  className="w-full px-4 py-3 rounded-xl liquid-glass-input text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-[#0A0E1A] p-1 rounded-xl border border-white/10 text-xs shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("PENDING");
                    setReservationsPage(1);
                  }}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    statusFilter === "PENDING" ? "bg-cta text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("CONFIRMED");
                    setReservationsPage(1);
                  }}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    statusFilter === "CONFIRMED" ? "bg-cta text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Confirmadas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setReservationsPage(1);
                  }}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    statusFilter === "ALL" ? "bg-cta text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Todas
                </button>
              </div>
            </div>

            {/* Resultado da Busca Unitária */}
            {reservation && (
              <div className="liquid-glass-card rounded-2xl p-6 border-2 border-cta/40 shadow-2xl animate-in fade-in space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-borderDark/60 pb-3 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código</span>
                    <span className="font-mono text-xl sm:text-2xl font-bold text-white tracking-widest bg-black/40 px-3 py-1 rounded-lg border border-white/10">
                      {reservation.code}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${reservation.status === "CONFIRMED"
                      ? "bg-emerald-950 border border-emerald-500/50 text-emerald-400"
                      : "bg-amber-950 border border-amber-500/50 text-amber-400"
                      }`}
                  >
                    {reservation.status === "CONFIRMED" ? "CONFIRMADO" : "AGUARDANDO PAGAMENTO"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Filme</span>
                    <span className="font-bold text-white text-sm">{reservation.session?.film?.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Sala</span>
                    <span className="font-semibold text-white">{getCanonicalRoomName(reservation.session?.room?.name)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Sessão</span>
                    <span className="font-semibold text-white">
                      {new Date(reservation.session?.startsAt || Date.now()).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}{" "}
                      às{" "}
                      {new Date(reservation.session?.startsAt || Date.now()).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Total a Pagar</span>
                    <span className="font-bold text-cta text-base">
                      R$ {Number(reservation.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 border-t border-borderDark/60">
                  <button
                    type="button"
                    onClick={() => abrirIngressos(reservation.code)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex sm:inline-block items-center justify-center"
                  >
                    Ver Ingressos
                  </button>
                  {reservation.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => iniciarPagamento(reservation)}
                      disabled={loading}
                      className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Confirmar Pagamento & Liberar</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lista Geral de Reservas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-borderDark/60 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Reservas para Retirada
                </span>
                <span className="text-xs text-slate-400">
                  Total listado: <strong className="text-white">{filteredReservations.length}</strong>
                </span>
              </div>

              {/* Lista de Reservas Organizada Horizontalmente */}
              {loadingList && reservationsList.length === 0 ? (
                <div className="text-center py-12 rounded-2xl liquid-glass-card text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cta" />
                  <span>Carregando reservas registradas...</span>
                </div>
              ) : filteredReservations.length === 0 ? (
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
                <>
                  <div className="space-y-2.5">
                    {paginatedReservations.map((item) => {
                      const isPending = item.status === "PENDING";
                      const isItemActionLoading = actionLoadingId === item.code;

                      return (
                        <div
                          key={item.id}
                          onClick={() => abrirIngressos(item.code)}
                          className="p-4 rounded-xl liquid-glass-card border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 cursor-pointer group"
                        >
                          {/* Bloco 1: Informações Principais (Código, Status, Horário) */}
                          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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

                          {/* Bloco 2: Informações da Reserva (Filme, Sala, Cliente) sem corte/truncate */}
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 text-[11px] block">Filme</span>
                              <span className="font-semibold text-white break-words group-hover:text-cta transition-colors leading-snug" title={item.filmTitle}>
                                {item.filmTitle}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[11px] block">Sala</span>
                              <span className="text-slate-200 break-words">
                                {getCanonicalRoomName(item.roomName)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[11px] block">Cliente</span>
                              <span className="text-slate-200 break-words" title={item.buyerName}>
                                {item.buyerName}
                              </span>
                            </div>
                          </div>

                          {/* Bloco 3: Informações Complementares (Poltronas, Valor Total) */}
                          <div className="flex flex-wrap items-center gap-4 text-xs shrink-0 justify-start lg:justify-end">
                            <div>
                              <span className="text-slate-400 text-[11px] block">Poltronas</span>
                              <span className="font-bold text-cta break-words">
                                {item.seats.join(", ") || "—"}
                              </span>
                            </div>
                            <div className="text-left lg:text-right">
                              <span className="text-slate-400 text-[11px] block">Total</span>
                              <span className="font-bold text-white text-sm">
                                R$ {item.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Bloco 4: Ação Administrativa Limpa com Visualização de Ingressos */}
                          <div
                            className="shrink-0 flex items-center justify-end gap-2 border-t lg:border-t-0 pt-2.5 lg:pt-0 border-white/5 w-full lg:w-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => abrirIngressos(item.code)}
                              className="flex-1 lg:flex-initial px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Ver ingressos"
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                              <span>Ver Ingressos</span>
                            </button>

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => iniciarPagamento(item)}
                                disabled={isItemActionLoading}
                                className="flex-1 lg:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {isItemActionLoading ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span>Dar Baixa</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Pagination
                    currentPage={reservationsPage}
                    totalItems={filteredReservations.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setReservationsPage}
                    itemLabel="reservas"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: CANCELAMENTO AUDITÁVEL DE VENDAS / INGRESSOS                        */}
        {/* ========================================================================= */}
        {activeTab === "CANCELAMENTO" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Campo de Busca de Ingressos */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Digite o código da reserva, CPF ou nome do cliente..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl liquid-glass-input text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-[#0A0E1A] p-1 rounded-xl border border-white/10 text-xs shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setTicketStatusFilter("SOLD")}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-bold transition-all cursor-pointer text-center ${ticketStatusFilter === "SOLD" ? "bg-cta text-white" : "text-slate-400 hover:text-white"
                    }`}
                >
                  Confirmados
                </button>
                <button
                  type="button"
                  onClick={() => setTicketStatusFilter("CANCELLED")}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-bold transition-all cursor-pointer text-center ${ticketStatusFilter === "CANCELLED" ? "bg-cta text-white" : "text-slate-400 hover:text-white"
                    }`}
                >
                  Cancelados
                </button>
                <button
                  type="button"
                  onClick={() => setTicketStatusFilter("ALL")}
                  className={`px-2 sm:px-3 py-2 rounded-lg font-bold transition-all cursor-pointer text-center ${ticketStatusFilter === "ALL" ? "bg-cta text-white" : "text-slate-400 hover:text-white"
                    }`}
                >
                  Todos
                </button>
              </div>
            </div>

            {/* Tabela / Lista de Vendas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-borderDark/60 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Ingressos Confirmados na Bilheteria
                </span>
                <span className="text-xs text-slate-400">
                  Total listado: <strong className="text-white">{filteredSoldTickets.length}</strong>
                </span>
              </div>

              {loadingTickets ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cta" />
                  <span>Carregando vendas e ingressos...</span>
                </div>
              ) : filteredSoldTickets.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs liquid-glass-card rounded-2xl p-6">
                  Nenhum ingresso encontrado para este filtro.
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {paginatedSoldTickets.map((t) => {
                      const isSold = t.status === "SOLD";
                      const sessionDate = new Date(t.session?.startsAt);
                      const isPast = sessionDate < new Date();

                      return (
                        <div
                          key={t.id}
                          onClick={() => abrirIngressoDoTicket(t)}
                          className="p-4 rounded-xl liquid-glass-card border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs cursor-pointer group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10 text-xs">
                                {t.code || t.id.slice(-6).toUpperCase()}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isSold
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-950 text-rose-300 border border-rose-500/30"
                                  }`}
                              >
                                {isSold ? "CONFIRMADO" : "CANCELADO"}
                              </span>
                              <span className="text-slate-400 font-semibold">
                                {t.type === "MEIA" ? "Meia-entrada" : "Inteira"}
                              </span>
                            </div>

                            <div className="pt-0.5">
                              <span className="font-bold text-white text-sm block">
                                {t.session?.film?.title}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {getCanonicalRoomName(t.session?.room?.name)} • Poltrona:{" "}
                                <strong className="text-cta font-bold">{t.seat?.seatCode}</strong> • Sessão:{" "}
                                {sessionDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às{" "}
                                {sessionDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 pt-2.5 md:pt-0 border-white/5">
                            <div className="flex sm:block items-center justify-between text-left md:text-right">
                              <span className="text-[11px] text-slate-400 block">
                                {t.buyer?.name || "Cliente Balcão"}
                              </span>
                              <span className="font-bold text-white text-sm">
                                R$ {Number(t.price || 0).toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => abrirIngressoDoTicket(t)}
                                className="flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                title="Ver ingresso"
                              >
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                <span>Ver Ingresso</span>
                              </button>
                              {isSold ? (
                                <button
                                  type="button"
                                  disabled={isPast}
                                  onClick={() => {
                                    setCancelModalTicket(t);
                                    setCancelReason("");
                                  }}
                                  className={`flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${isPast
                                    ? "bg-white/5 text-slate-500 cursor-not-allowed"
                                    : "bg-rose-600/80 hover:bg-rose-600 text-white shadow-xs"
                                    }`}
                                  title={isPast ? "Sessão já iniciada ou encerrada" : "Cancelar este ingresso"}
                                >
                                  <Ban className="w-3.5 h-3.5 shrink-0" />
                                  <span>Cancelar Venda</span>
                                </button>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic">
                                  Justificativa: {t.cancellationAudit?.reason || "Cancelamento de balcão"}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Pagination
                    currentPage={ticketsPage}
                    totalItems={filteredSoldTickets.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setTicketsPage}
                    itemLabel="ingressos"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <CineDoomFooter simple className="mt-8" />

      {/* Modal Canônico de Cancelamento com Justificativa Obrigatória */}
      {cancelModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12182B] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-xs font-sans">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                  Ação Auditada
                </span>
                <h3 className="text-base font-bold text-white">Cancelar Venda de Ingresso</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalTicket(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Filme:</span>
                <strong className="text-white">{cancelModalTicket.session?.film?.title}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Poltrona:</span>
                <strong className="text-cta">{cancelModalTicket.seat?.seatCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor a estornar:</span>
                <strong className="text-white">R$ {Number(cancelModalTicket.price || 0).toFixed(2)}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-200 font-bold text-xs">
                Motivo / Justificativa do Cancelamento <span className="text-cta">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Desistência do cliente, erro no horário selecionado, etc."
                className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white placeholder-slate-500 outline-none focus:border-cta resize-none"
              />
              <span className="text-[10px] text-slate-500 block">
                Este registro é imutável e será gravado no log de auditoria de cancelamentos do cinema.
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCancelModalTicket(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelSubmitting || !cancelReason.trim()}
                onClick={executarCancelamento}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-rose-600/30"
              >
                {cancelSubmitting ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Oficial da Etapa 4 (Pagamento) para Baixa de Reservas */}
      {paymentModalReservation && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingPayment) {
              setPaymentModalReservation(null);
            }
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-[#0E1322] border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl text-left space-y-4 cursor-default font-sans my-auto max-h-[92vh] overflow-y-auto"
          >
            {/* Cabeçalho do Modal no padrão do Flow */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cta/20 text-cta flex items-center justify-center border border-cta/30">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cta text-white">
                      Etapa 4 • Pagamento
                    </span>
                    <span className="font-mono text-xs text-slate-400 font-bold">
                      {paymentModalReservation.code}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Baixa de Reserva & Pagamento na Bilheteria
                  </h2>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingPayment}
                onClick={() => setPaymentModalReservation(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Idêntico à Etapa 4 do BookingFlow */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start w-full">
              {/* Coluna Esquerda: Métodos de Pagamento */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="p-4 rounded-2xl liquid-glass-card border border-white/10 space-y-3.5">
                  <div>
                    <h3 className="text-sm font-bold text-white">Forma de Pagamento</h3>
                    <p className="text-xs text-slate-400">
                      Selecione a forma de pagamento presencial no balcão
                    </p>
                  </div>

                  {/* Grid de Formas de Pagamento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("DINHEIRO")}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                        selectedPaymentMethod === "DINHEIRO"
                          ? "bg-emerald-500/20 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10 scale-[1.01]"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedPaymentMethod === "DINHEIRO"
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white">Dinheiro</div>
                        <div className="text-[11px] text-slate-400">Espécie recebida no caixa</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("DEBITO")}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                        selectedPaymentMethod === "DEBITO"
                          ? "bg-emerald-500/20 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10 scale-[1.01]"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedPaymentMethod === "DEBITO"
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white">Cartão de Débito</div>
                        <div className="text-[11px] text-slate-400">Maquininha de cartão</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("CREDITO")}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                        selectedPaymentMethod === "CREDITO"
                          ? "bg-emerald-500/20 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10 scale-[1.01]"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedPaymentMethod === "CREDITO"
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white">Cartão de Crédito</div>
                        <div className="text-[11px] text-slate-400">Maquininha de cartão</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("PIX")}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                        selectedPaymentMethod === "PIX"
                          ? "bg-emerald-500/20 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10 scale-[1.01]"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedPaymentMethod === "PIX"
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white">PIX</div>
                        <div className="text-[11px] text-slate-400">QR Code presencial</div>
                      </div>
                    </button>
                  </div>

                  {/* Se Dinheiro selecionado: Campo de Valor Recebido e Troco */}
                  {selectedPaymentMethod === "DINHEIRO" && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5 animate-in fade-in duration-150">
                      <label className="block text-xs font-semibold text-slate-300">
                        Valor Recebido em Dinheiro (R$)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 50,00"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0E1A] border border-white/10 text-white text-sm outline-none focus:border-cta font-mono"
                      />
                      {(() => {
                        const tendered = parseFloat(cashTendered.replace(",", ".")) || 0;
                        const total = paymentModalReservation.totalAmount;
                        if (tendered >= total && tendered > 0) {
                          const troco = tendered - total;
                          return (
                            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between font-semibold">
                              <span>Troco a devolver:</span>
                              <span className="text-sm font-bold text-emerald-400">
                                R$ {troco.toFixed(2)}
                              </span>
                            </div>
                          );
                        }
                        if (tendered > 0 && tendered < total) {
                          const falta = total - tendered;
                          return (
                            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between font-semibold">
                              <span>Valor insuficiente:</span>
                              <span className="text-sm font-bold text-amber-400">
                                Faltam R$ {falta.toFixed(2)}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 text-xs text-slate-400">
                    <Info className="w-4 h-4 text-cta shrink-0" />
                    <span>
                      Ao confirmar, o status da reserva muda para <strong>CONFIRMADA</strong> e os ingressos emitidos ficam disponíveis imediatamente para impressão.
                    </span>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Resumo da Reserva e Ação */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="p-4 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block border-b border-white/10 pb-2">
                    Resumo da Reserva
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400">Filme:</span>
                      <span className="font-bold text-white text-right leading-tight max-w-[200px]">
                        {paymentModalReservation.filmTitle}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Sala:</span>
                      <span className="font-semibold text-slate-200">
                        {getCanonicalRoomName(paymentModalReservation.roomName)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Sessão:</span>
                      <span className="font-semibold text-slate-200">
                        {new Date(paymentModalReservation.sessionStartsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Poltronas:</span>
                      <span className="font-bold text-cta">
                        {paymentModalReservation.seats.join(", ") || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Cliente:</span>
                      <span className="text-slate-200 font-medium truncate max-w-[180px]">
                        {paymentModalReservation.buyerName}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block uppercase font-semibold">Total a Cobrar:</span>
                      <span className="text-xs font-bold text-emerald-400 uppercase">
                        {selectedPaymentMethod}
                      </span>
                    </div>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      R$ {paymentModalReservation.totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmittingPayment}
                    onClick={finalizarPagamento}
                    className="w-full py-3 rounded-xl font-bold text-xs tracking-wide shadow-lg shadow-emerald-600/30 bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isSubmittingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Emitindo Ingressos...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Confirmar Pagamento e Emitir Ingressos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
