"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  Clock,
  Radio,
  ArrowLeft,
  ShoppingCart,
  RotateCcw,
  Film,
  Building,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
  User,
  Mail,
  CreditCard,
} from "lucide-react";
import { SeatingGrid, type GridSeatItem } from "@/modules/bilheteria/components/seating-grid";
import { useSessionSeats } from "@/modules/bilheteria/hooks/use-session-seats";
import { getCanonicalRoomName } from "@/shared/experiences";
import { CineDoomHeader } from "@/components/cinedoom-header";

interface SessionOption {
  id: string;
  startsAt: string;
  price: string | number;
  film: {
    id: string;
    title: string;
    durationMinutes: number;
  };
  room: {
    id: string;
    name: string;
    capacity: number;
  };
}

// Fallback mock caso nenhuma sessao esteja cadastrada no banco de dados
const generateFallbackSeats = (): GridSeatItem[] => {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const seats: GridSeatItem[] = [];

  rows.forEach((row) => {
    for (let col = 1; col <= 10; col++) {
      seats.push({
        id: `fallback-seat-${row}-${col}`,
        rowLabel: row,
        columnNumber: col,
        seatCode: `${row}${col}`,
        status: "AVAILABLE",
        price: 30.0,
      });
    }
  });

  return seats;
};

export default function BilheteriaMapaAssentosPage() {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [saleSuccessResult, setSaleSuccessResult] = useState<any | null>(null);

  // Form states do comprador (AC-6 / LGPD)
  const [buyerName, setBuyerName] = useState("");
  const [buyerCpf, setBuyerCpf] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerLgpdConsent, setBuyerLgpdConsent] = useState(true);

  // Carrega lista de sessoes ativas
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch("/api/sessoes");
        if (res.ok) {
          const data: SessionOption[] = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSessions(data);
            if (!selectedSessionId) {
              setSelectedSessionId(data[0].id);
            }
            return;
          }
        }

        // Fallback resiliente para catálogo público de filmes e sessões
        const portalRes = await fetch("/api/portal/filmes");
        if (portalRes.ok) {
          const filmsData = await portalRes.json();
          const flattened: SessionOption[] = (filmsData || []).flatMap((f: any) =>
            (f.sessions || []).map((s: any) => ({
              id: s.id,
              startsAt: s.startsAt,
              price: s.price,
              film: {
                id: f.id,
                title: f.title,
                durationMinutes: f.duration,
              },
              room: s.room,
            }))
          );
          if (flattened.length > 0) {
            setSessions(flattened);
            if (!selectedSessionId) {
              setSelectedSessionId(flattened[0].id);
            }
          }
        }
      } catch {
        // Silencioso; usara fallback
      }
    }

    loadSessions();
  }, [selectedSessionId]);

  // Hook de polling a cada 2000ms (AC-2 / ADR-006)
  const {
    seats: liveSeats,
    isLoading: isSeatsLoading,
    error: pollingError,
    lastUpdated,
    refetch,
  } = useSessionSeats(selectedSessionId, {
    intervalMs: 2000,
  });

  // Limpa assentos selecionados ao trocar de sessao
  useEffect(() => {
    setSelectedSeatIds([]);
  }, [selectedSessionId]);

  // AC-2 / US-5: Remove automaticamente da selecao qualquer assento que tenha sido vendido ou reservado via polling
  useEffect(() => {
    if (liveSeats.length > 0) {
      setSelectedSeatIds((prev) =>
        prev.filter((id) => {
          const seat = liveSeats.find((s) => s.id === id);
          return seat ? seat.status === "AVAILABLE" : true;
        })
      );
    }
  }, [liveSeats]);

  const activeSession = sessions.find((s) => s.id === selectedSessionId);
  const displayedSeats = selectedSessionId && liveSeats.length > 0 ? liveSeats : generateFallbackSeats();
  const unitPrice = activeSession ? Number(activeSession.price) : 30.0;

  const handleSeatToggle = (seat: GridSeatItem) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]
    );
  };

  const handleResetSelection = () => {
    setSelectedSeatIds([]);
  };

  const handleOpenCheckout = () => {
    setCheckoutError(null);
    setSaleSuccessResult(null);
    setIsCheckoutModalOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutModalOpen(false);
    setCheckoutError(null);
    if (saleSuccessResult) {
      setSelectedSeatIds([]);
      setSaleSuccessResult(null);
      refetch();
    }
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || selectedSeatIds.length === 0) return;

    if (!buyerLgpdConsent) {
      setCheckoutError("O consentimento LGPD e obrigatorio antes de emitir os ingressos.");
      return;
    }

    setIsSubmittingSale(true);
    setCheckoutError(null);

    try {
      const response = await fetch("/api/vendas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          sessionSeatIds: selectedSeatIds,
          buyer: {
            name: buyerName.trim(),
            cpf: buyerCpf.trim(),
            email: buyerEmail.trim(),
            lgpdConsent: buyerLgpdConsent,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            data.error || "Conflito de reserva: um ou mais assentos selecionados acabaram de ser vendidos."
          );
        }
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.map((err: any) => err.message).join(" | "));
        }
        throw new Error(data.error || "Falha ao processar venda de ingressos.");
      }

      setSaleSuccessResult(data);
      refetch();
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Erro desconhecido ao confirmar venda.");
      refetch();
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const selectedSeats = displayedSeats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((acc, curr) => acc + (curr.price || unitPrice), 0);

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Header Oficial CineDoom */}
      <CineDoomHeader activePage="bilheteria" />

      <div className="p-3 sm:p-6 lg:p-8 flex-1 flex flex-col">
        <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 flex-1 w-full">
          {/* Header Operacional (FRAME-2) */}
          <div className="liquid-glass-card rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl border border-white/10">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/60 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 animate-pulse text-blue-400" />
                  Terminal de Atendimento
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Sincronização em Tempo Real
                </span>
                {lastUpdated && (
                  <span className="text-[11px] text-slate-400">
                    Atualizado às {lastUpdated.toLocaleTimeString("pt-BR")}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 sm:gap-3">
                <Ticket className="w-7 h-7 sm:w-8 sm:h-8 text-cta" />
                Mapa de Assentos da Sessão
              </h1>

              {activeSession ? (
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-cta" />
                    {activeSession.film.title} ({activeSession.film.durationMinutes} min)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-cta" />
                    {getCanonicalRoomName(activeSession.room.name)} ({activeSession.room.capacity} lugares)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cta" />
                    {new Date(activeSession.startsAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-300/80">
                  <span>Modo Demonstração: Exibindo sala modelo IMAX de 120 lugares.</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Seletor de Sessao */}
              {sessions.length > 0 && (
                <select
                  value={selectedSessionId || ""}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="liquid-glass-input rounded-xl px-3 py-2 text-xs text-white border border-borderDark focus:border-cta focus:outline-none"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0E1322] text-white">
                      {s.film.title} - {getCanonicalRoomName(s.room.name)} ({new Date(s.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => refetch()}
                title="Forçar atualização manual"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <Link
                href="/bilheteria/baixa-reserva"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cta/15 hover:bg-cta/25 border border-cta/30 text-xs font-semibold text-cta transition-colors"
                title="Gestão de Reservas"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Reservas</span>
              </Link>
            </div>
          </div>

        {/* Feedback de Erro de Polling */}
        {pollingError && (
          <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{pollingError}</span>
          </div>
        )}

        {/* Componente SeatingGrid com dados ao vivo */}
        <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          {isSeatsLoading && (
            <div className="absolute inset-0 bg-[#16213E]/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <RefreshCw className="w-4 h-4 animate-spin text-[#E94560]" />
                Sincronizando assentos...
              </div>
            </div>
          )}

          <SeatingGrid
            seats={displayedSeats}
            selectedSeatIds={selectedSeatIds}
            onSeatToggle={handleSeatToggle}
            unitPrice={unitPrice}
            showLegend={true}
            showScreen={true}
            showSummary={true}
          />
        </div>

        {/* Rodape de Acao para Checkout */}
        <div className="liquid-glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <ShoppingCart className="w-5 h-5 text-[#E94560]" />
            <div>
              <span className="font-bold text-white">
                {selectedSeats.length}{" "}
                {selectedSeats.length === 1 ? "ingresso selecionado" : "ingressos selecionados"}
              </span>
              {selectedSeats.length > 0 && (
                <span className="text-gray-400 text-xs ml-2">
                  ({selectedSeats.map((s) => s.seatCode).join(", ")})
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              {selectedSeatIds.length > 0 && (
                <button
                  onClick={handleResetSelection}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}

              <div className="text-right">
                <span className="text-[11px] sm:text-xs text-gray-400 block uppercase">Subtotal</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  R$ {totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              disabled={selectedSeats.length === 0}
              onClick={handleOpenCheckout}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#E94560] hover:bg-[#d63d56] text-white text-sm font-bold shadow-lg shadow-[#E94560]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Avançar para Venda
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Finalizacao de Venda (FRAME-3 / AC-1 / AC-6) */}
      {isCheckoutModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCheckout();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="liquid-glass-card rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 relative cursor-default"
          >
            <button
              onClick={handleCloseCheckout}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {saleSuccessResult ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white">Venda Confirmada!</h3>
                  <p className="text-xs text-gray-300">
                    Ingressos emitidos e assentos confirmados com sucesso.
                  </p>
                </div>

                <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-gray-800 pb-2">
                    <span className="text-gray-400">Comprador:</span>
                    <span className="font-bold text-white">{saleSuccessResult.buyer.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800 pb-2">
                    <span className="text-gray-400">CPF do Comprador:</span>
                    <span className="font-mono text-gray-300">{saleSuccessResult.buyer.cpfMasked}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800 pb-2">
                    <span className="text-gray-400">Ingressos Emitidos:</span>
                    <span className="font-bold text-[#E94560]">{saleSuccessResult.tickets.length} un.</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-black">
                    <span className="text-gray-300">Total Pago:</span>
                    <span className="text-emerald-400">R$ {saleSuccessResult.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCloseCheckout}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-colors"
                >
                  Concluir / Nova Venda
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmSale} className="space-y-5">
                <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E94560]/20 text-[#E94560] flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Finalizar Venda Presencial</h3>
                    <p className="text-xs text-gray-400">
                      {selectedSeats.length} {selectedSeats.length === 1 ? "assento selecionado" : "assentos selecionados"} ({selectedSeats.map(s => s.seatCode).join(", ")})
                    </p>
                  </div>
                </div>

                {checkoutError && (
                  <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#E94560]" />
                      Nome do Comprador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo da Silva"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full liquid-glass-input rounded-xl px-3 py-2 text-white placeholder-gray-400 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300 font-medium mb-1">
                        CPF do Comprador *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={buyerCpf}
                        onChange={(e) => setBuyerCpf(e.target.value)}
                        className="w-full liquid-glass-input rounded-xl px-3 py-2 text-white placeholder-gray-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#E94560]" />
                        E-mail *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="comprador@email.com"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full liquid-glass-input rounded-xl px-3 py-2 text-white placeholder-gray-400 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-gray-300 text-[11px] leading-relaxed">
                      <input
                        type="checkbox"
                        checked={buyerLgpdConsent}
                        onChange={(e) => setBuyerLgpdConsent(e.target.checked)}
                        className="mt-0.5 rounded border-gray-700 text-[#E94560] focus:ring-[#E94560]"
                      />
                      <span>
                        Declaro consentimento para armazenamento e tratamento dos dados pessoais conforme a Lei Geral de Protecao de Dados (LGPD - Lei no 13.709/2018).
                      </span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-400 block uppercase font-medium">Subtotal</span>
                    <span className="text-xl font-black text-emerald-400">R$ {totalPrice.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmittingSale}
                      onClick={handleCloseCheckout}
                      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSale}
                      className="px-5 py-2.5 rounded-xl bg-[#E94560] hover:bg-[#d63d56] text-white text-xs font-bold shadow-lg shadow-[#E94560]/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingSale && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      Confirmar Venda
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
