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
} from "lucide-react";
import { SeatingGrid, useSessionSeats, type GridSeatItem } from "@/modules/bilheteria";

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

  rows.forEach((row, rIdx) => {
    for (let col = 1; col <= 10; col++) {
      let status: GridSeatItem["status"] = "AVAILABLE";
      if (rIdx === 0 && (col === 3 || col === 4 || col === 8)) status = "SOLD";
      if (rIdx === 2 && (col === 5 || col === 6)) status = "SOLD";
      if (rIdx === 4 && col === 5) status = "RESERVED";
      if (rIdx === 7 && col === 1) status = "BLOCKED";

      seats.push({
        id: `fallback-seat-${row}-${col}`,
        rowLabel: row,
        columnNumber: col,
        seatCode: `${row}${col}`,
        status,
        price: 35.0,
      });
    }
  });

  return seats;
};

export default function BilheteriaMapaAssentosPage() {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);

  // Carrega lista de sessoes ativas
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch("/api/sessoes");
        if (res.ok) {
          const data: SessionOption[] = await res.json();
          setSessions(data);
          if (data.length > 0 && !selectedSessionId) {
            setSelectedSessionId(data[0].id);
          }
        }
      } catch {
        // Silencioso; usara fallback
      } finally {
        setIsSessionsLoading(false);
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
  const unitPrice = activeSession ? Number(activeSession.price) : 35.0;

  const handleSeatToggle = (seat: GridSeatItem) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]
    );
  };

  const handleResetSelection = () => {
    setSelectedSeatIds([]);
  };

  const selectedSeats = displayedSeats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((acc, curr) => acc + (curr.price || unitPrice), 0);

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-[#F5F5F5] p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Operacional (FRAME-2) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/60 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse text-blue-400" />
                FRAME-2 · Bilheteria Operacional
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Polling 2000ms Ativo (AC-2)
              </span>
              {lastUpdated && (
                <span className="text-[11px] text-gray-500">
                  Atualizado as {lastUpdated.toLocaleTimeString("pt-BR")}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Ticket className="w-8 h-8 text-[#E94560]" />
              Mapa de Assentos da Sessao
            </h1>

            {activeSession ? (
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
                <span className="flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-[#E94560]" />
                  {activeSession.film.title} ({activeSession.film.durationMinutes} min)
                </span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-[#E94560]" />
                  {activeSession.room.name} ({activeSession.room.capacity} lugares)
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#E94560]" />
                  {new Date(activeSession.startsAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-300/80">
                <span>Modo Demonstracao: Exibindo sala modelo IMAX de 100 lugares.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Sessao */}
            {sessions.length > 0 && (
              <select
                value={selectedSessionId || ""}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="bg-[#16213E] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E94560]"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.film.title} - {s.room.name} ({new Date(s.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => refetch()}
              title="Forcar atualizacao manual"
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Inicio
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
        <div className="bg-[#16213E] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
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
        <div className="bg-[#16213E]/80 border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
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

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
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
              <span className="text-xs text-gray-400 block uppercase">Subtotal</span>
              <span className="text-2xl font-black text-emerald-400">
                R$ {totalPrice.toFixed(2)}
              </span>
            </div>

            <button
              disabled={selectedSeats.length === 0}
              onClick={() => alert("Avancar para Venda Atomica com SELECT FOR UPDATE (Issue #11)")}
              className="px-6 py-2.5 rounded-xl bg-[#E94560] hover:bg-[#d63d56] text-white text-sm font-bold shadow-lg shadow-[#E94560]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Avancar para Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
