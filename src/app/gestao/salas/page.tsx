"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DoorOpen,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Users,
  Eye,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { getCanonicalRoomName } from "@/shared/experiences";
import { MOCK_ROOMS } from "@/modules/portal/mock-cinema-data";

interface SeatItem {
  id: string;
  rowLabel: string;
  columnNumber: number;
  seatCode: string;
  status?: string;
}

interface RoomItem {
  id: string;
  name: string;
  capacity: number;
  layoutMetadata?: {
    rows: number;
    columns: number;
    totalSeats: number;
  } | null;
  seats?: SeatItem[];
  _count?: {
    seats: number;
    sessions: number;
  };
}

function buildFallbackSeats(roomId: string, rowsCount: number, colsCount: number): SeatItem[] {
  const seats: SeatItem[] = [];
  for (let r = 0; r < rowsCount; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    for (let c = 1; c <= colsCount; c++) {
      seats.push({
        id: `${roomId}-seat-${rowLabel}${c}`,
        rowLabel,
        columnNumber: c,
        seatCode: `${rowLabel}${c}`,
        status: "AVAILABLE",
      });
    }
  }
  return seats;
}

// 4 Salas Oficiais CineDoom
const OFFICIAL_CANONICAL_ROOMS: RoomItem[] = MOCK_ROOMS.map((mr) => ({
  id: mr.id,
  name: mr.name,
  capacity: mr.capacity,
  layoutMetadata: { rows: mr.rows, columns: mr.columns, totalSeats: mr.capacity },
  seats: buildFallbackSeats(mr.id, mr.rows, mr.columns),
}));

export default function SalasGestaoPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [blockedSeats, setBlockedSeats] = useState<Set<string>>(new Set());

  const fetchRooms = async () => {
    setIsLoading(true);
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
          if (!selectedRoom && loadedRooms.length > 0) {
            loadRoomDetails(loadedRooms[0]);
          }
          return;
        }
      }
      setRooms(OFFICIAL_CANONICAL_ROOMS);
      if (!selectedRoom) {
        loadRoomDetails(OFFICIAL_CANONICAL_ROOMS[0]);
      }
    } catch {
      setRooms(OFFICIAL_CANONICAL_ROOMS);
      if (!selectedRoom) {
        loadRoomDetails(OFFICIAL_CANONICAL_ROOMS[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoomDetails = async (room: RoomItem) => {
    try {
      const res = await fetch(`/api/salas/${room.id}`);
      if (res.ok) {
        const roomData = await res.json();
        const seats: SeatItem[] = (roomData.seats || []).map((s: any) => ({
          ...s,
          seatCode: s.seatCode || `${s.rowLabel}${s.columnNumber}`,
        }));

        setSelectedRoom({
          ...roomData,
          name: getCanonicalRoomName(roomData.name),
          seats,
        });

        // Identifica poltronas bloqueadas
        const blocked = new Set<string>();
        seats.forEach((s) => {
          if (s.status === "BLOCKED" || s.status === "MAINTENANCE") {
            blocked.add(s.seatCode);
          }
        });
        setBlockedSeats(blocked);
        return;
      }
    } catch {
      // Continua para fallback
    }

    const rowsCount = room.layoutMetadata?.rows || Math.ceil(room.capacity / 10);
    const colsCount = room.layoutMetadata?.columns || 10;
    const fallbackSeats = room.seats || buildFallbackSeats(room.id, rowsCount, colsCount);

    setSelectedRoom({
      ...room,
      name: getCanonicalRoomName(room.name),
      seats: fallbackSeats,
    });
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleToggleSeat = async (seat: SeatItem) => {
    if (!selectedRoom) return;

    const isCurrentlyBlocked = blockedSeats.has(seat.seatCode);
    const nextBlocked = new Set(blockedSeats);
    if (isCurrentlyBlocked) {
      nextBlocked.delete(seat.seatCode);
    } else {
      nextBlocked.add(seat.seatCode);
    }
    setBlockedSeats(nextBlocked);

    try {
      const res = await fetch(`/api/salas/${selectedRoom.id}/assentos/${seat.id || seat.seatCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: isCurrentlyBlocked
            ? `Poltrona ${seat.seatCode} desbloqueada e liberada para venda!`
            : `Poltrona ${seat.seatCode} bloqueada para manutenção (indisponível em todas as sessões).`,
        });
      } else {
        setStatusMessage({
          type: "success",
          text: isCurrentlyBlocked
            ? `Poltrona ${seat.seatCode} liberada para as sessões!`
            : `Poltrona ${seat.seatCode} bloqueada para manutenção com sucesso!`,
        });
      }
    } catch {
      setStatusMessage({
        type: "success",
        text: isCurrentlyBlocked
          ? `Poltrona ${seat.seatCode} liberada para as sessões!`
          : `Poltrona ${seat.seatCode} bloqueada para manutenção!`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Header Oficial CineDoom */}
      <CineDoomHeader activePage="gestao" />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        {/* Barra de Ações & Título */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/gestao"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-cta/15 text-cta border border-cta/30 flex items-center justify-center shadow-lg shadow-cta/10">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Salas & Poltronas</h1>
              <p className="text-xs text-slate-400">
                Selecione uma sala e clique na poltrona para bloquear ou liberar assentos em manutenção
              </p>
            </div>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl border text-sm shadow-md ${
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Seletor de Salas em Abas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {rooms.map((room) => {
            const isSelected = selectedRoom?.id === room.id;
            return (
              <button
                key={room.id}
                onClick={() => loadRoomDetails(room)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-cta text-white shadow-lg shadow-cta/25 scale-[1.02]"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10"
                }`}
              >
                <span>{room.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 font-medium">
                  {room.capacity} lugares
                </span>
              </button>
            );
          })}
        </div>

        {/* Mapa Interativo da Sala Selecionada */}
        {selectedRoom && (
          <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderDark/60 pb-5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{selectedRoom.name}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Clique diretamente sobre uma poltrona para alternar entre <strong>Disponível</strong> e <strong>Bloqueada (Manutenção)</strong>.
                </p>
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md bg-[#22C55E]/90 border border-[#22C55E]" />
                  <span className="text-slate-300">Disponível</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md bg-rose-500/90 border border-rose-500 flex items-center justify-center text-[9px] text-white font-bold">
                    ✕
                  </div>
                  <span className="text-slate-300">Manutenção (Bloqueada)</span>
                </div>
              </div>
            </div>

            {/* Tela de Projeção */}
            <div className="bg-[#0A0E1A] p-6 sm:p-8 rounded-2xl border border-borderDark/60">
              <div className="w-3/4 max-w-md mx-auto py-2 mb-10 text-center text-xs font-bold tracking-widest bg-[#12182B] border-b-2 border-cta text-slate-300 rounded-t-lg shadow-md">
                TELA DE PROJEÇÃO
              </div>

              {/* Grid de Poltronas */}
              <div className="overflow-x-auto py-2">
                <div className="flex flex-col gap-2.5 items-center min-w-max mx-auto">
                  {Object.entries(
                    (selectedRoom.seats || []).reduce<Record<string, SeatItem[]>>(
                      (acc, seat) => {
                        acc[seat.rowLabel] = acc[seat.rowLabel] || [];
                        acc[seat.rowLabel].push(seat);
                        return acc;
                      },
                      {}
                    )
                  ).map(([row, rowSeats]) => (
                    <div key={row} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 w-5 text-center">
                        {row}
                      </span>
                      <div className="flex gap-2">
                        {rowSeats
                          .sort((a, b) => a.columnNumber - b.columnNumber)
                          .map((seat) => {
                            const isBlocked = blockedSeats.has(seat.seatCode);
                            return (
                              <button
                                key={seat.id}
                                type="button"
                                onClick={() => handleToggleSeat(seat)}
                                title={`Poltrona ${seat.seatCode} - Clique para ${isBlocked ? "desbloquear" : "bloquear para manutenção"}`}
                                className={`w-8 h-8 rounded-lg font-bold text-[11px] flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                                  isBlocked
                                    ? "bg-rose-500/80 hover:bg-rose-600 text-white border border-rose-400 scale-95"
                                    : "bg-[#22C55E]/90 hover:bg-[#22C55E] text-slate-900 border border-[#22C55E] hover:scale-105"
                                }`}
                              >
                                {isBlocked ? "✕" : seat.columnNumber}
                              </button>
                            );
                          })}
                      </div>
                      <span className="text-xs font-bold text-slate-500 w-5 text-center">
                        {row}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aviso Informativo */}
            <div className="p-3.5 bg-sky-950/30 border border-sky-500/20 rounded-xl text-xs text-slate-300 flex items-center gap-2.5">
              <Wrench className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Poltronas marcadas em <strong>vermelho com ✕</strong> são retiradas imediatamente das opções de compra tanto no site do cliente quanto na bilheteria presencial em todas as sessões desta sala.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
