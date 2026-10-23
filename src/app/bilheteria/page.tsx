"use client";

import { useState } from "react";
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
} from "lucide-react";
import { SeatingGrid, type GridSeatItem } from "@/modules/bilheteria";

// Mock de demonstracao da sala 10x10 com 100 assentos (FRAME-2)
const generateInitialMockSeats = (): GridSeatItem[] => {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const seats: GridSeatItem[] = [];

  rows.forEach((row, rIdx) => {
    for (let col = 1; col <= 10; col++) {
      let status: GridSeatItem["status"] = "AVAILABLE";

      // Simula alguns assentos vendidos e reservados
      if (rIdx === 0 && (col === 3 || col === 4 || col === 8)) status = "SOLD";
      if (rIdx === 2 && (col === 5 || col === 6)) status = "SOLD";
      if (rIdx === 4 && col === 5) status = "RESERVED";
      if (rIdx === 7 && col === 1) status = "BLOCKED";

      seats.push({
        id: `seat-${row}-${col}`,
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
  const [seats, setSeats] = useState<GridSeatItem[]>(generateInitialMockSeats());
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const unitPrice = 35.0;

  const handleSeatToggle = (seat: GridSeatItem) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]
    );
  };

  const handleResetSelection = () => {
    setSelectedSeatIds([]);
  };

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.length * unitPrice;

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-[#F5F5F5] p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header do Terminal de Bilheteria (FRAME-2) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/60 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse text-blue-400" />
                FRAME-2 · Bilheteria Operacional
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                Polling 2s Ativo (AC-2)
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Ticket className="w-8 h-8 text-[#E94560]" />
              Mapa de Assentos da Sessao
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-[#E94560]" />
                Duna: Parte Dois (166 min)
              </span>
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-[#E94560]" />
                Sala 1 IMAX (100 lugares)
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#E94560]" />
                Hoje as 19:30
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Inicio
            </Link>
            {selectedSeatIds.length > 0 && (
              <button
                onClick={handleResetSelection}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Componente Central SeatingGrid */}
        <div className="bg-[#16213E] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <SeatingGrid
            seats={seats}
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
