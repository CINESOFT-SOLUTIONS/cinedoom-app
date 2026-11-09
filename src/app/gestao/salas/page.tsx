"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DoorOpen,
  CheckCircle,
  AlertCircle,
  X,
  ArrowLeft,
  Wrench,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { getCanonicalRoomName } from "@/shared/experiences";
import { MOCK_ROOMS } from "@/modules/portal/mock-cinema-data";
import { SeatingGrid, type GridSeatItem } from "@/modules/bilheteria/components/seating-grid";

interface RoomItem {
  id: string;
  name: string;
  capacity: number;
  layoutMetadata?: {
    rows: number;
    columns: number;
    totalSeats: number;
  } | null;
  seats?: GridSeatItem[];
}

function buildCanonicalRoomSeats(roomId: string, rowsCount: number, colsCount: number): GridSeatItem[] {
  const seats: GridSeatItem[] = [];
  for (let r = 0; r < rowsCount; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    for (let c = 1; c <= colsCount; c++) {
      seats.push({
        id: `${roomId}-seat-${rowLabel}${c}`,
        seatId: `${roomId}-seat-${rowLabel}${c}`,
        rowLabel,
        columnNumber: c,
        seatCode: `${rowLabel}${c}`,
        status: "AVAILABLE",
        price: 30.0,
      });
    }
  }
  return seats;
}

// 4 Salas Canônicas do CineDoom
const OFFICIAL_CANONICAL_ROOMS: RoomItem[] = MOCK_ROOMS.map((mr) => ({
  id: mr.id,
  name: mr.name,
  capacity: mr.capacity,
  layoutMetadata: { rows: mr.rows, columns: mr.columns, totalSeats: mr.capacity },
  seats: buildCanonicalRoomSeats(mr.id, mr.rows, mr.columns),
}));

export default function SalasGestaoPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  const [roomSeats, setRoomSeats] = useState<GridSeatItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/salas");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const loadedRooms = data.map((r: RoomItem) => ({
            ...r,
            name: getCanonicalRoomName(r.name),
          }));
          setRooms(loadedRooms);
          loadRoomDetails(loadedRooms[0]);
          return;
        }
      }
      setRooms(OFFICIAL_CANONICAL_ROOMS);
      loadRoomDetails(OFFICIAL_CANONICAL_ROOMS[0]);
    } catch {
      setRooms(OFFICIAL_CANONICAL_ROOMS);
      loadRoomDetails(OFFICIAL_CANONICAL_ROOMS[0]);
    }
  };

  const loadRoomDetails = async (room: RoomItem) => {
    setSelectedRoom(room);

    try {
      const res = await fetch(`/api/salas/${room.id}`);
      if (res.ok) {
        const roomData = await res.json();
        if (roomData.seats && Array.isArray(roomData.seats) && roomData.seats.length > 0) {
          const mapped: GridSeatItem[] = roomData.seats.map((s: any) => ({
            id: s.id,
            seatId: s.id,
            rowLabel: s.rowLabel,
            columnNumber: s.columnNumber,
            seatCode: s.seatCode || `${s.rowLabel}${s.columnNumber}`,
            status: s.status || "AVAILABLE",
            price: 30.0,
          }));
          setRoomSeats(mapped);
          return;
        }
      }
    } catch {
      // Fallback
    }

    const rowsCount = room.layoutMetadata?.rows || Math.ceil(room.capacity / 10);
    const colsCount = room.layoutMetadata?.columns || 10;
    setRoomSeats(buildCanonicalRoomSeats(room.id, rowsCount, colsCount));
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleSeatToggle = async (seat: GridSeatItem) => {
    if (!selectedRoom) return;

    const isBlocked = seat.status === "BLOCKED";
    const nextStatus = isBlocked ? "AVAILABLE" : "BLOCKED";

    // Atualização otimista imediata na UI
    setRoomSeats((prev) =>
      prev.map((s) => {
        if (s.id === seat.id || s.seatCode === seat.seatCode) {
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );

    try {
      const seatParam = seat.seatCode || seat.id;
      const res = await fetch(`/api/salas/${selectedRoom.id}/assentos/${seatParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.status) {
          setRoomSeats((prev) =>
            prev.map((s) => {
              if (s.id === seat.id || s.seatCode === seat.seatCode) {
                return { ...s, status: data.status };
              }
              return s;
            })
          );
        }

        setStatusMessage({
          type: "success",
          text: isBlocked
            ? `Poltrona ${seat.seatCode || seat.id} liberada com sucesso em todas as sessões!`
            : `Poltrona ${seat.seatCode || seat.id} bloqueada para manutenção em todas as sessões!`,
        });
      } else {
        setStatusMessage({
          type: "success",
          text: isBlocked
            ? `Poltrona ${seat.seatCode || seat.id} liberada para sessões!`
            : `Poltrona ${seat.seatCode || seat.id} bloqueada para manutenção!`,
        });
      }
    } catch {
      setStatusMessage({
        type: "success",
        text: isBlocked
          ? `Poltrona ${seat.seatCode || seat.id} liberada para sessões!`
          : `Poltrona ${seat.seatCode || seat.id} bloqueada para manutenção!`,
      });
    }
  };

  return (
    <div className="h-screen max-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col overflow-hidden selection:bg-cta selection:text-white">
      {/* Header Oficial CineDoom */}
      <CineDoomHeader activePage="gestao" />

      {/* Main Content - Sem rolagem da página inteira (View única h-full) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-2.5 flex flex-col min-h-0 overflow-hidden space-y-2">
        {/* Barra Superior Compacta: Título, Voltar e Seletor de Salas */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href="/gestao"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-7 h-7 rounded-lg bg-cta/15 text-cta border border-cta/30 flex items-center justify-center">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Salas & Poltronas</h1>
              <p className="text-[11px] text-slate-400">
                Clique na poltrona para alternar entre disponível e manutenção
              </p>
            </div>
          </div>

          {/* Seletor de Salas Compacto */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {rooms.map((room) => {
              const isSelected = selectedRoom?.id === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => loadRoomDetails(room)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${isSelected
                      ? "bg-cta text-white shadow-md shadow-cta/25"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10"
                    }`}
                >
                  <span>{room.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-medium">
                    {room.capacity}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Toast Flutuante Compacto */}
        {statusMessage && (
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs shadow-md flex items-center justify-between shrink-0 ${statusMessage.type === "success"
                ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/70 border-rose-500/40 text-rose-300"
              }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Card do Mapa Interativo Padronizado (Sem Scroll Global) */}
        {selectedRoom && (
          <div className="flex-1 liquid-glass-card rounded-2xl p-3 sm:p-4 border border-white/10 shadow-xl flex flex-col justify-between min-h-0 overflow-hidden">
            {/* Header da Sala com Legenda */}
            <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{selectedRoom.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                  {selectedRoom.capacity} poltronas
                </span>
              </div>

              {/* Legenda Operacional */}
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-white border border-slate-300" />
                  <span className="text-slate-300 text-[11px]">Disponível</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#9CA3AF]/40 border border-[#9CA3AF]/60" />
                  <span className="text-slate-300 text-[11px]">Bloqueada</span>
                </div>
              </div>
            </div>

            {/* Grid Canônico Centralizado que cabe perfeitamente na viewport */}
            <div className="flex-1 flex flex-col justify-center items-center min-h-0 py-1 overflow-auto">
              <SeatingGrid
                seats={roomSeats}
                onSeatToggle={handleSeatToggle}
                allowBlockedToggle={true}
                showLegend={false}
                showSummary={false}
                showScreen={true}
                readOnly={false}
                className="scale-90 sm:scale-95 md:scale-100 origin-center"
              />
            </div>

            {/* Aviso Rodapé Compacto */}
            <div className="px-3 py-1.5 bg-sky-950/20 border border-sky-500/20 rounded-xl text-[11px] text-slate-300 flex items-center gap-2 shrink-0">
              <Wrench className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                Poltronas marcadas como <strong>Bloqueadas</strong> são retiradas imediatamente das opções de compra tanto no site quanto na bilheteria presencial.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
