"use client";

import React, { useMemo } from "react";
import { Monitor, Check } from "lucide-react";

/**
 * Estados cromaticos oficiais do mapa de assentos (ui-mockups / FRAME-2 / AC-1 / AC-2)
 * AVAILABLE: #22C55E (Verde esmeralda / disponivel)
 * SELECTED: #E94560 (Vermelho destaque CineDoom / selecionado para checkout)
 * SOLD: #EF4444 (Vermelho mudo / vendido / desabilitado)
 * RESERVED: #F59E0B (Ambar / reserva online pendente)
 * BLOCKED: #9CA3AF (Cinza / bloqueado por manutencao)
 */
export type SeatChromaticStatus = "AVAILABLE" | "SELECTED" | "SOLD" | "RESERVED" | "BLOCKED";

export interface GridSeatItem {
  id: string;
  seatId?: string;
  rowLabel: string;
  columnNumber: number;
  seatCode?: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED" | string;
  price?: number;
}

export interface SeatingGridProps {
  seats: GridSeatItem[];
  selectedSeatIds?: string[];
  onSeatToggle?: (seat: GridSeatItem) => void;
  maxSelection?: number;
  readOnly?: boolean;
  unitPrice?: number;
  showLegend?: boolean;
  showScreen?: boolean;
  showSummary?: boolean;
  className?: string;
}

const statusColorClasses: Record<SeatChromaticStatus, { base: string; text: string; label: string }> = {
  AVAILABLE: {
    base: "bg-[#22C55E] hover:bg-[#16A34A] border-[#16A34A] text-white hover:scale-105 active:scale-95 shadow-sm shadow-[#22C55E]/30",
    text: "text-white",
    label: "Disponivel",
  },
  SELECTED: {
    base: "bg-[#E94560] hover:bg-[#D63D56] border-[#D63D56] text-white ring-2 ring-white/80 scale-105 shadow-md shadow-[#E94560]/40 font-bold",
    text: "text-white",
    label: "Selecionado",
  },
  SOLD: {
    base: "bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]/60 cursor-not-allowed line-through opacity-70",
    text: "text-[#EF4444]/60",
    label: "Vendido",
  },
  RESERVED: {
    base: "bg-[#F59E0B] border-[#D97706] text-amber-950 font-semibold cursor-not-allowed opacity-85",
    text: "text-amber-950",
    label: "Reservado",
  },
  BLOCKED: {
    base: "bg-[#9CA3AF]/20 border-[#9CA3AF]/40 text-[#9CA3AF]/40 cursor-not-allowed opacity-50",
    text: "text-[#9CA3AF]/40",
    label: "Bloqueado",
  },
};

interface SeatButtonProps {
  seat: GridSeatItem;
  effectiveStatus: SeatChromaticStatus;
  isClickable: boolean;
  onClick: (seat: GridSeatItem) => void;
}

const SeatButton = React.memo(function SeatButton({
  seat,
  effectiveStatus,
  isClickable,
  onClick,
}: SeatButtonProps) {
  const code = seat.seatCode || `${seat.rowLabel}${seat.columnNumber}`;
  const style = statusColorClasses[effectiveStatus];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && isClickable) {
      e.preventDefault();
      onClick(seat);
    }
  };

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={`Fileira ${seat.rowLabel}, Assento ${seat.columnNumber} - ${style.label}`}
      aria-selected={effectiveStatus === "SELECTED"}
      aria-disabled={!isClickable}
      disabled={!isClickable}
      onClick={() => isClickable && onClick(seat)}
      onKeyDown={handleKeyDown}
      tabIndex={isClickable ? 0 : -1}
      data-testid={`seat-${code}`}
      data-seat-id={seat.id}
      data-status={effectiveStatus}
      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md border flex items-center justify-center text-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#E94560] select-none ${style.base}`}
    >
      {effectiveStatus === "SELECTED" ? (
        <Check className="w-4 h-4 stroke-[3]" />
      ) : (
        <span className="font-semibold text-[11px] leading-none">{seat.columnNumber}</span>
      )}
    </button>
  );
});

export function SeatingGrid({
  seats,
  selectedSeatIds = [],
  onSeatToggle,
  maxSelection,
  readOnly = false,
  unitPrice = 35.0,
  showLegend = true,
  showScreen = true,
  showSummary = true,
  className = "",
}: SeatingGridProps) {
  // Agrupa os assentos por fileira (A, B, C, ...)
  const groupedRows = useMemo(() => {
    const map = new Map<string, GridSeatItem[]>();

    seats.forEach((seat) => {
      const row = seat.rowLabel.toUpperCase();
      if (!map.has(row)) {
        map.set(row, []);
      }
      map.get(row)!.push(seat);
    });

    // Ordena as fileiras em ordem alfabetica
    const sortedRowLabels = Array.from(map.keys()).sort();

    return sortedRowLabels.map((label) => {
      const rowSeats = map.get(label)!;
      rowSeats.sort((a, b) => a.columnNumber - b.columnNumber);
      return { label, seats: rowSeats };
    });
  }, [seats]);

  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  const handleSeatClick = (seat: GridSeatItem) => {
    if (readOnly || !onSeatToggle) return;
    if (seat.status !== "AVAILABLE") return;

    if (!selectedSet.has(seat.id) && maxSelection && selectedSeatIds.length >= maxSelection) {
      return;
    }

    onSeatToggle(seat);
  };

  const selectedSeatsList = useMemo(() => {
    return seats.filter((s) => selectedSet.has(s.id));
  }, [seats, selectedSet]);

  const totalPrice = useMemo(() => {
    return selectedSeatsList.reduce((acc, curr) => acc + (curr.price || unitPrice), 0);
  }, [selectedSeatsList, unitPrice]);

  return (
    <div className={`flex flex-col items-center w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Visual da Tela de Projecao */}
      {showScreen && (
        <div className="w-full flex flex-col items-center space-y-2 mb-4">
          <div className="w-3/4 max-w-xl h-2 bg-gradient-to-r from-transparent via-[#E94560] to-transparent rounded-full shadow-[0_0_15px_rgba(233,69,96,0.6)]" />
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-gray-400">
            <Monitor className="w-3.5 h-3.5 text-[#E94560]" />
            <span>TELA / PROJECAO</span>
          </div>
        </div>
      )}

      {/* Grid de Assentos com Fileiras */}
      <div
        role="grid"
        aria-label="Mapa interativo de assentos"
        className="w-full overflow-x-auto pb-4 flex flex-col items-center"
      >
        <div className="min-w-fit space-y-2.5 p-2">
          {groupedRows.map(({ label, seats: rowSeats }) => (
            <div key={label} role="row" className="flex items-center gap-2 sm:gap-3">
              {/* Rotulo da fileira a esquerda */}
              <span className="w-6 text-center text-xs font-bold text-gray-400 select-none">
                {label}
              </span>

              {/* Botoes de assento */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {rowSeats.map((seat) => {
                  const isSelected = selectedSet.has(seat.id) && seat.status === "AVAILABLE";
                  const effectiveStatus: SeatChromaticStatus = isSelected
                    ? "SELECTED"
                    : (seat.status as SeatChromaticStatus);
                  const isClickable = !readOnly && seat.status === "AVAILABLE";

                  return (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      effectiveStatus={effectiveStatus}
                      isClickable={isClickable}
                      onClick={handleSeatClick}
                    />
                  );
                })}
              </div>

              {/* Rotulo da fileira a direita */}
              <span className="w-6 text-center text-xs font-bold text-gray-400 select-none">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legenda Cromatica */}
      {showLegend && (
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-3 border-t border-gray-800 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#22C55E] border border-[#16A34A] shadow-sm shadow-[#22C55E]/30" />
            <span>Disponivel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#E94560] border border-[#D63D56] shadow-sm shadow-[#E94560]/40" />
            <span>Selecionado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#EF4444]/20 border border-[#EF4444]/40" />
            <span className="text-gray-400">Vendido / Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#F59E0B] border border-[#D97706]" />
            <span className="text-gray-400">Reservado (Online)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#9CA3AF]/20 border border-[#9CA3AF]/40" />
            <span className="text-gray-400">Bloqueado</span>
          </div>
        </div>
      )}

      {/* Barra de Resumo e Valor Total */}
      {showSummary && (
        <div className="w-full bg-[#16213E] border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="text-xs text-gray-400 uppercase font-semibold">
              Assentos Selecionados ({selectedSeatsList.length})
            </div>
            <div className="text-sm font-bold text-white flex flex-wrap gap-1.5 justify-center sm:justify-start">
              {selectedSeatsList.length === 0 ? (
                <span className="text-gray-500 font-normal text-xs">Nenhum assento selecionado</span>
              ) : (
                selectedSeatsList.map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 bg-[#0F3460] text-[#E94560] rounded border border-[#E94560]/30 text-xs"
                  >
                    {s.seatCode || `${s.rowLabel}${s.columnNumber}`}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-xs text-gray-400 uppercase font-semibold">Valor Total</div>
            <div className="text-xl font-extrabold text-emerald-400">
              R$ {totalPrice.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
