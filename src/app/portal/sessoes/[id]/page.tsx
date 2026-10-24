"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Film,
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Ticket,
  ShieldCheck,
  User,
  Mail,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { SeatingGrid, type GridSeatItem } from "@/modules/bilheteria/components/seating-grid";

interface SessionData {
  id: string;
  tenantId: string;
  cinemaName: string;
  status: string;
  startsAt: string;
  price: number;
  canReserveOnline: boolean;
  minutesUntilSession: number;
  film: {
    id: string;
    title: string;
    synopsis?: string;
    duration: number;
    classification?: string;
    genre?: string;
    posterUrl?: string;
  };
  room: {
    id: string;
    name: string;
    capacity: number;
    rows: number;
    columns: number;
  };
}

export default function PortalSessionReservationPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { data: authSession } = useSession();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [seats, setSeats] = useState<GridSeatItem[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Form State
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCpf, setBuyerCpf] = useState("");
  const [lgpdConsent, setLgpdConsent] = useState(false);

  // Auto-fill from authenticated session
  useEffect(() => {
    if (authSession?.user) {
      if (authSession.user.name && !buyerName) setBuyerName(authSession.user.name);
      if (authSession.user.email && !buyerEmail) setBuyerEmail(authSession.user.email);
    }
  }, [authSession, buyerName, buyerEmail]);

  // Load Session Info
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/portal/sessoes/${sessionId}`);
        if (res.ok) {
          const data: SessionData = await res.json();
          setSessionData(data);
        } else {
          setErrorNotice("Sessão não encontrada ou indisponível.");
        }
      } catch (err) {
        console.error("Erro ao carregar sessão:", err);
        setErrorNotice("Erro ao conectar ao servidor.");
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  // Polling dos Assentos a cada 2000ms (AC-2)
  const fetchSeats = useCallback(async () => {
    if (!sessionId) return;
    try {
      const headers: Record<string, string> = {};
      if (sessionData?.tenantId) {
        headers["x-tenant-id"] = sessionData.tenantId;
      }
      const res = await fetch(`/api/sessoes/${sessionId}/assentos`, {
        headers,
        cache: "no-store",
      });

      if (res.ok) {
        const data: GridSeatItem[] = await res.json();
        setSeats(data);
        setLastUpdated(new Date());

        // Se algum assento selecionado foi vendido ou reservado por outro usuário, desmarca
        setSelectedSeatIds((prevSelected) => {
          return prevSelected.filter((selectedId) => {
            const currentSeat = data.find((s) => s.id === selectedId);
            return currentSeat && currentSeat.status === "AVAILABLE";
          });
        });
      }
    } catch (err) {
      console.error("Erro no polling de assentos:", err);
    }
  }, [sessionId, sessionData?.tenantId]);

  useEffect(() => {
    if (sessionData) {
      fetchSeats();
      const interval = setInterval(fetchSeats, 2000);
      return () => clearInterval(interval);
    }
  }, [sessionData, fetchSeats]);

  const handleSeatToggle = (seat: GridSeatItem) => {
    if (seat.status !== "AVAILABLE") return;

    setErrorNotice(null);
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        if (prev.length >= 6) {
          setErrorNotice("Limite máximo de 6 assentos por reserva online.");
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const unitPrice = sessionData?.price || 0;
  const totalPrice = selectedSeats.length * unitPrice;

  // Mask CPF input helper
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length > 9) {
      val = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`;
    } else if (val.length > 6) {
      val = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`;
    } else if (val.length > 3) {
      val = `${val.slice(0, 3)}.${val.slice(3)}`;
    }
    setBuyerCpf(val);
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (selectedSeatIds.length === 0) {
      setErrorNotice("Selecione ao menos um assento no mapa para continuar.");
      return;
    }

    if (!lgpdConsent) {
      setErrorNotice("O consentimento com a LGPD é obrigatório para confirmar a reserva.");
      return;
    }

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionData?.tenantId) {
        headers["x-tenant-id"] = sessionData.tenantId;
      }

      const res = await fetch("/api/portal/reservas", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          sessionSeatIds: selectedSeatIds,
          buyer: {
            name: buyerName,
            email: buyerEmail,
            cpf: buyerCpf,
            lgpdConsent: true,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrorNotice(
            "Um ou mais assentos selecionados acabaram de ser vendidos ou reservados por outro cliente. Por favor, escolha outros lugares."
          );
          fetchSeats();
        } else if (res.status === 422 && data.code === "ANTECEDENCE_VIOLATION") {
          setErrorNotice(
            "Reservas online encerradas: falta menos de 60 minutos para a sessão. Os assentos restantes estão disponíveis exclusivamente na bilheteria física."
          );
        } else {
          setErrorNotice(data.error || "Não foi possível concluir a reserva.");
        }
        return;
      }

      // Sucesso: Redireciona para o comprovante
      const reservationId = data.reservation.id;
      router.push(`/portal/reservas/${reservationId}/comprovante`);
    } catch (err) {
      console.error("Erro ao confirmar reserva:", err);
      setErrorNotice("Falha na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1B] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Carregando mapa interativo da sala...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-[#0F0F1B] text-white flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-[#E94560] mx-auto" />
          <h2 className="text-2xl font-black">Sessão Indisponível</h2>
          <p className="text-xs text-gray-400">A sessão solicitada não existe ou foi encerrada.</p>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E94560] text-white font-bold text-xs shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a Programação
          </Link>
        </div>
      </div>
    );
  }

  const sessionDate = new Date(sessionData.startsAt);
  const formattedDate = sessionDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const formattedTime = sessionDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg flex flex-col font-sans">
      {/* Header White Liquid Glass */}
      <header className="sticky top-0 z-40 h-16 md:h-20 liquid-glass-white transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 h-full flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="h-9 px-3 rounded-full bg-slate-900/[0.06] hover:bg-slate-900/[0.12] border border-slate-900/[0.08] flex items-center gap-1.5 text-slate-800 font-semibold text-xs transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm md:text-base leading-tight tracking-tight">
                  {sessionData.film.title}
                </span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-cta/15 text-cta border border-cta/30 uppercase tracking-wider">
                  Sala {sessionData.room.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {formattedDate} às {formattedTime} • R$ {sessionData.price.toFixed(2)} por assento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-700 bg-white/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/80 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Mapa ao vivo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Antecedence Notice (AC-14) */}
      {!sessionData.canReserveOnline && (
        <div className="bg-amber-950/70 border-b border-amber-500/40 px-4 py-3 text-amber-200 text-xs flex items-center justify-center gap-2.5 shadow-md">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Reservas online encerradas:</strong> Falta menos de 60 minutos para o início desta sessão (Critério AC-14). Para assistir a este filme, adquira seus ingressos diretamente na bilheteria física do cinema.
          </span>
        </div>
      )}

      {/* Main Grid & Checkout Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Seating Map Area */}
        <section className="lg:col-span-8 liquid-glass-card rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#E94560]" />
                Selecione seus Assentos
              </h2>
              <p className="text-[11px] text-gray-400">
                Clique nos assentos verdes disponíveis para selecioná-los para a sua reserva.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-gray-400 block">Capacidade</span>
              <span className="text-xs font-mono font-bold text-gray-200">
                {sessionData.room.capacity} lugares
              </span>
            </div>
          </div>

          {/* Interactive SeatingGrid */}
          <div className="py-4">
            <SeatingGrid
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onSeatToggle={handleSeatToggle}
              unitPrice={sessionData.price}
              showLegend={true}
              showScreen={true}
              showSummary={false}
              readOnly={!sessionData.canReserveOnline}
            />
          </div>
        </section>

        {/* Reservation Sidebar */}
        <aside className="lg:col-span-4 liquid-glass-card rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-5 lg:sticky lg:top-20">
          <div className="border-b border-gray-800 pb-4">
            <h3 className="text-base font-black text-white">Resumo da Reserva</h3>
            <p className="text-xs text-gray-400">Pagamento presencial no balcão</p>
          </div>

          {errorNotice && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Film & Seats Overview */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Filme:</span>
              <span className="font-bold text-white text-right">{sessionData.film.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Horário:</span>
              <span className="font-mono text-gray-200">{formattedTime} ({formattedDate})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Assentos Selecionados:</span>
              <span className="font-bold text-[#E94560]">
                {selectedSeats.length > 0
                  ? selectedSeats.map((s) => s.seatCode || `${s.rowLabel}${s.columnNumber}`).join(", ")
                  : "Nenhum assento"}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-700/80 pt-2 text-sm font-black">
              <span className="text-gray-300">Total a Pagar no Balcão:</span>
              <span className="text-emerald-400">R$ {totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleConfirmReservation} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#E94560]" />
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  disabled={!sessionData.canReserveOnline || isSubmitting}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-white placeholder-gray-400 text-xs disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#E94560]" />
                  E-mail para Confirmação *
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  disabled={!sessionData.canReserveOnline || isSubmitting}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-white placeholder-gray-400 text-xs disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#E94560]" />
                  CPF do Titular *
                </label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={buyerCpf}
                  onChange={handleCpfChange}
                  disabled={!sessionData.canReserveOnline || isSubmitting}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-white placeholder-gray-400 text-xs disabled:opacity-50"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-gray-300 text-[11px] leading-relaxed">
                  <input
                    type="checkbox"
                    checked={lgpdConsent}
                    onChange={(e) => setLgpdConsent(e.target.checked)}
                    disabled={!sessionData.canReserveOnline || isSubmitting}
                    className="mt-0.5 rounded border-gray-700 text-[#E94560] focus:ring-[#E94560] disabled:opacity-50"
                  />
                  <span>
                    Concordo com os termos da LGPD e autorizo o armazenamento seguro de meus dados para emissão do voucher de reserva.
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                !sessionData.canReserveOnline ||
                selectedSeatIds.length === 0 ||
                !lgpdConsent ||
                isSubmitting
              }
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E94560] to-[#d63d56] hover:brightness-110 text-white font-black text-sm shadow-lg shadow-[#E94560]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Garantindo Assentos na Transação ACID...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Reserva Online</span>
                </>
              )}
            </button>
          </form>

          {/* Instructions Notice */}
          <div className="bg-[#121222] border border-gray-800 rounded-xl p-3.5 space-y-1.5 text-[11px] text-gray-400">
            <span className="font-bold text-gray-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Como funciona o pagamento:
            </span>
            <p className="leading-relaxed">
              Sua reserva garante os assentos até <strong>1 hora antes do início da sessão</strong>. Apresente o código identificador na bilheteria física para pagar em dinheiro, débito ou crédito.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
