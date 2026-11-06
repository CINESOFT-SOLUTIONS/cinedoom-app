"use client";

import React, { useMemo } from "react";
import { Monitor, Check, MoveHorizontal } from "lucide-react";

/**
 * Estados cromaticos oficiais do mapa de assentos (CineDoom Design System / AC-1 / AC-2)
 * AVAILABLE: #3B82F6 (Azul Royal Cinema / Disponivel - paleta escura sem verde)
 * SELECTED: #E94560 (Vermelho destaque CineDoom / Selecionado para checkout)
 * SOLD: #EF4444 (Vermelho mudo / Vendido / Desabilitado)
 * RESERVED: #F59E0B (Ambar / Reserva online pendente)
 * BLOCKED: #9CA3AF (Cinza / Bloqueado por manutencao)
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

interface SeatStyleConfig {
  base: string;
  backrest: string;
  armrest: string;
  cushion: string;
  text: string;
  label: string;
}

const statusColorClasses: Record<SeatChromaticStatus, SeatStyleConfig> = {
  AVAILABLE: {
    base: "bg-[#3B82F6]",
    backrest: "bg-[#2563EB] border border-[#1D4ED8] group-hover:bg-[#3B82F6]",
    armrest: "bg-[#1D4ED8] border border-[#1E40AF] group-hover:bg-[#2563EB]",
    cushion:
      "bg-[#3B82F6] border-[#2563EB] text-white group-hover:bg-[#60A5FA] group-hover:shadow-[0_0_12px_rgba(59,130,246,0.5)] shadow-[#3B82F6]/30",
    text: "text-white",
    label: "Disponivel",
  },
  SELECTED: {
    base: "bg-[#E94560]",
    backrest: "bg-[#D63D56] border border-[#C12E46] ring-1 ring-white/60",
    armrest: "bg-[#C12E46] border border-[#9E1B32] ring-1 ring-white/60",
    cushion:
      "bg-[#E94560] border-[#D63D56] text-white ring-2 ring-white/90 shadow-md shadow-[#E94560]/50 font-bold scale-105",
    text: "text-white",
    label: "Selecionado",
  },
  SOLD: {
    base: "bg-[#EF4444]/20",
    backrest: "bg-[#EF4444]/15 border border-[#EF4444]/25 opacity-60",
    armrest: "bg-[#EF4444]/15 border border-[#EF4444]/25 opacity-60",
    cushion: "bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]/60 line-through opacity-70",
    text: "text-[#EF4444]/60",
    label: "Vendido",
  },
  RESERVED: {
    base: "bg-[#F59E0B]",
    backrest: "bg-[#D97706] border border-[#B45309] opacity-85",
    armrest: "bg-[#B45309] border border-[#92400E] opacity-85",
    cushion: "bg-[#F59E0B] border-[#D97706] text-amber-950 font-semibold opacity-90",
    text: "text-amber-950",
    label: "Reservado",
  },
  BLOCKED: {
    base: "bg-[#9CA3AF]/20",
    backrest: "bg-[#9CA3AF]/15 border border-[#9CA3AF]/25 opacity-50",
    armrest: "bg-[#9CA3AF]/15 border border-[#9CA3AF]/25 opacity-50",
    cushion: "bg-[#9CA3AF]/20 border-[#9CA3AF]/40 text-[#9CA3AF]/40 opacity-50",
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
      className={`group relative w-7 h-8 sm:w-8 sm:h-9 md:w-9 md:h-10 flex flex-col items-center justify-between p-0.5 rounded-t-lg transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-[#E94560] focus:ring-offset-1 focus:ring-offset-[#1A1A2E] select-none ${
        isClickable ? "hover:scale-110 active:scale-95 cursor-pointer" : "cursor-not-allowed"
      }`}
    >
      {/* 1. Encosto superior ergonomico com curvatura suave */}
      <div
        className={`w-5 sm:w-6 md:w-7 h-2 sm:h-2.5 rounded-t-md shadow-xs transition-colors duration-150 ${style.backrest}`}
      />

      {/* 2. Regiao do assento e apoios de braco laterais */}
      <div className="w-full flex items-center justify-between gap-0.5">
        {/* Apoio de braco esquerdo */}
        <div
          className={`w-1 sm:w-1 h-4 sm:h-5 rounded-full shadow-xs transition-colors duration-150 ${style.armrest}`}
        />

        {/* Assento / Almofada central */}
        <div
          className={`flex-1 h-4 sm:h-5 rounded-sm border flex items-center justify-center font-bold transition-all duration-150 shadow-xs ${style.cushion}`}
        >
          {effectiveStatus === "SELECTED" ? (
            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3] text-white" />
          ) : (
            <span className="text-[9px] sm:text-[10px] md:text-xs leading-none">
              {seat.columnNumber}
            </span>
          )}
        </div>

        {/* Apoio de braco direito */}
        <div
          className={`w-1 sm:w-1 h-4 sm:h-5 rounded-full shadow-xs transition-colors duration-150 ${style.armrest}`}
        />
      </div>
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
    <div className={`flex flex-col items-center w-full max-w-4xl mx-auto space-y-3 sm:space-y-4 ${className}`}>
      {/* Visual da Tela de Projecao Curvada */}
      {showScreen && (
        <div className="w-full flex flex-col items-center mb-1 pt-1 select-none">
          <div className="relative w-full max-w-2xl px-4 flex flex-col items-center">
            {/* Feixe sutil de iluminacao difusa da tela */}
            <div className="w-3/4 max-w-lg h-4 bg-gradient-to-b from-[#E94560]/15 via-[#E94560]/5 to-transparent blur-sm rounded-t-full pointer-events-none" />

            {/* SVG da Tela Curvada */}
            <div className="w-full max-w-lg -mt-2 flex flex-col items-center">
              <svg
                viewBox="0 0 500 45"
                className="w-full h-6 sm:h-8 text-[#E94560] overflow-visible drop-shadow-[0_0_15px_rgba(233,69,96,0.6)]"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="screenCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E94560" stopOpacity="0.2" />
                    <stop offset="25%" stopColor="#E94560" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                    <stop offset="75%" stopColor="#E94560" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#E94560" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <path
                  d="M 25 38 Q 250 8 475 38"
                  fill="none"
                  stroke="url(#screenCurveGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>

              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold tracking-widest uppercase text-gray-400 mt-1 shadow-[0_0_15px_rgba(233,69,96,0.6)]">
                <Monitor className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E94560]" />
                <span>TELA / PROJECAO</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dica de arraste horizontal no celular */}
      <div className="md:hidden flex items-center justify-center gap-1.5 text-[10px] text-gray-400 py-0.5 px-2.5 rounded-full bg-white/5 border border-white/10 select-none">
        <MoveHorizontal className="w-3 h-3 text-[#E94560] animate-pulse" />
        <span>Arraste para os lados para visualizar todos os assentos</span>
      </div>

      {/* Grid de Assentos com Poltronas Estilizadas e Corredor Central */}
      <div
        role="grid"
        aria-label="Mapa interativo de assentos"
        className="w-full overflow-x-auto pb-2 flex flex-col items-center touch-pan-x"
      >
        <div className="min-w-fit space-y-1.5 sm:space-y-2 md:space-y-2.5 p-1">
          {groupedRows.map(({ label, seats: rowSeats }) => {
            const hasCentralAisle = rowSeats.length >= 4;
            const splitIndex = hasCentralAisle ? Math.ceil(rowSeats.length / 2) : rowSeats.length;
            const leftBlock = rowSeats.slice(0, splitIndex);
            const rightBlock = hasCentralAisle ? rowSeats.slice(splitIndex) : [];

            const renderSeat = (seat: GridSeatItem) => {
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
            };

            return (
              <div key={label} role="row" className="flex items-center gap-2 sm:gap-3 md:gap-4">
                {/* Rotulo da fileira a esquerda */}
                <div className="w-6 sm:w-7 flex items-center justify-center">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/5 border border-white/10 text-center text-[10px] sm:text-xs font-bold text-gray-400 flex items-center justify-center select-none shadow-xs">
                    {label}
                  </span>
                </div>

                {/* Bloco lateral esquerdo */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {leftBlock.map(renderSeat)}
                </div>

                {/* Corredor central mais amplo dividindo os blocos laterais */}
                {hasCentralAisle && (
                  <div
                    className="w-6 sm:w-8 md:w-10 flex items-center justify-center pointer-events-none select-none"
                    aria-hidden="true"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
                  </div>
                )}

                {/* Bloco lateral direito */}
                {rightBlock.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {rightBlock.map(renderSeat)}
                  </div>
                )}

                {/* Rotulo da fileira a direita */}
                <div className="w-6 sm:w-7 flex items-center justify-center">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/5 border border-white/10 text-center text-[10px] sm:text-xs font-bold text-gray-400 flex items-center justify-center select-none shadow-xs">
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda Cromatica (Azul Royal Cinema para Disponivel) */}
      {showLegend && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-5 pt-2 border-t border-gray-800/80 text-[10px] sm:text-[11px] text-gray-300">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-3 h-3 rounded bg-[#3B82F6] border border-[#2563EB] shadow-xs shadow-[#3B82F6]/30" />
            <span>Disponivel</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-3 h-3 rounded bg-[#E94560] border border-[#D63D56] shadow-xs shadow-[#E94560]/40" />
            <span>Selecionado</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-3 h-3 rounded bg-[#EF4444]/20 border border-[#EF4444]/40" />
            <span className="text-gray-400">Vendido / Ocupado</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-3 h-3 rounded bg-[#F59E0B] border border-[#D97706]" />
            <span className="text-gray-400">Reservado (Online)</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-3 h-3 rounded bg-[#9CA3AF]/20 border border-[#9CA3AF]/40" />
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
                    className="px-2 py-0.5 bg-[#0F3460] text-[#E94560] rounded border border-[#E94560]/30 text-xs font-semibold"
                  >
                    {s.seatCode || `${s.rowLabel}${s.columnNumber}`}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-xs text-gray-400 uppercase font-semibold">Valor Total</div>
            <div className="text-xl font-extrabold text-[#E94560]">
              R$ {totalPrice.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
